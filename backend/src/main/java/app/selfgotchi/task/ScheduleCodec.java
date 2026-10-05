package app.selfgotchi.task;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.TaskValidator.Violation;
import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.FreshnessSchedule;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.QuotaSchedule;
import app.selfgotchi.state.model.Recurrence;
import app.selfgotchi.state.model.Schedule;
import app.selfgotchi.state.model.TaskType;

/**
 * Converts between the JSONB schedule format in DESIGN.md and the {@link Schedule} records.
 * Hand-written (rather than Jackson annotations on the records) so the State Engine's model
 * stays free of serialization concerns and errors point at the exact field.
 */
@Component
public class ScheduleCodec {

    private static final String ROOT = "schedule";
    private static final Pattern TIME = Pattern.compile("\\d{2}:\\d{2}");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final Map<String, DayOfWeek> DAY_CODES = Map.of(
        "MON", DayOfWeek.MONDAY, "TUE", DayOfWeek.TUESDAY, "WED", DayOfWeek.WEDNESDAY,
        "THU", DayOfWeek.THURSDAY, "FRI", DayOfWeek.FRIDAY, "SAT", DayOfWeek.SATURDAY, "SUN", DayOfWeek.SUNDAY);
    private static final Map<TaskType, Set<String>> ALLOWED_FIELDS = Map.of(
        TaskType.CHECK, Set.of("type", "recurrence", "days", "deadline", "dueSoonMinutes"),
        TaskType.METER, Set.of("type", "slots", "count", "minGapMinutes", "firstBy", "lastBy"),
        TaskType.QUOTA, Set.of("type", "timesPerWeek", "weekStarts"),
        TaskType.FRESHNESS, Set.of("type", "thresholdsDays"));

    private final ObjectMapper mapper;

    public ScheduleCodec(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    // ---- decoding -------------------------------------------------------------------------

    public Schedule fromJson(String json) {
        try {
            return decode(mapper.readTree(json));
        } catch (JsonProcessingException e) {
            throw new ValidationException(ROOT, "not valid JSON");
        }
    }

    public Schedule decode(JsonNode node) {
        if (node == null || !node.isObject()) {
            throw new ValidationException(ROOT, "must be an object");
        }
        Reader r = new Reader(node);
        TaskType type = r.enumValue("type", TaskType.class, null);
        if (type == null) {
            r.errors.add(new Violation(ROOT + ".type", "must be one of CHECK, METER, QUOTA, FRESHNESS"));
            throw new ValidationException(r.errors);
        }
        r.rejectUnknown(ALLOWED_FIELDS.get(type));

        Schedule schedule = null;
        try {
            schedule = switch (type) {
                case CHECK -> new CheckSchedule(
                    r.enumValue("recurrence", Recurrence.class, Recurrence.DAILY),
                    r.days("days"),
                    r.requiredTime("deadline"),
                    r.integer("dueSoonMinutes", CheckSchedule.DEFAULT_DUE_SOON_MINUTES));
                case METER -> new MeterSchedule(
                    r.slots("slots"),
                    r.optionalInteger("count"),
                    r.integer("minGapMinutes", 0),
                    r.time("firstBy"),
                    r.time("lastBy"));
                case QUOTA -> new QuotaSchedule(
                    r.requiredInteger("timesPerWeek"),
                    r.day("weekStarts", DayOfWeek.MONDAY));
                case FRESHNESS -> new FreshnessSchedule(r.integers("thresholdsDays"));
            };
        } catch (IllegalArgumentException | NullPointerException e) {
            if (r.errors.isEmpty()) {
                r.errors.add(new Violation(ROOT, describe(e)));
            }
        }
        if (!r.errors.isEmpty()) {
            throw new ValidationException(r.errors);
        }
        return schedule;
    }

    private static String describe(RuntimeException e) {
        // Records throw NullPointerException(fieldName) from Objects.requireNonNull.
        return e instanceof NullPointerException ? e.getMessage() + " is required" : e.getMessage();
    }

    /** Reads fields of one schedule object, collecting errors instead of failing on the first. */
    private static final class Reader {
        private final JsonNode node;
        private final List<Violation> errors = new ArrayList<>();

        Reader(JsonNode node) {
            this.node = node;
        }

        void rejectUnknown(Set<String> allowed) {
            Iterator<String> names = node.fieldNames();
            while (names.hasNext()) {
                String name = names.next();
                if (!allowed.contains(name)) {
                    errors.add(new Violation(path(name), "unknown field"));
                }
            }
        }

        <E extends Enum<E>> E enumValue(String field, Class<E> type, E fallback) {
            JsonNode value = node.get(field);
            if (absent(value)) {
                return fallback;
            }
            try {
                return Enum.valueOf(type, value.asText());
            } catch (IllegalArgumentException e) {
                errors.add(new Violation(path(field), "unknown value '" + value.asText() + "'"));
                return fallback;
            }
        }

        Integer optionalInteger(String field) {
            JsonNode value = node.get(field);
            if (absent(value)) {
                return null;
            }
            if (!value.isIntegralNumber()) {
                errors.add(new Violation(path(field), "must be a whole number"));
                return null;
            }
            return value.intValue();
        }

        int integer(String field, int fallback) {
            Integer value = optionalInteger(field);
            return value == null ? fallback : value;
        }

        int requiredInteger(String field) {
            if (absent(node.get(field))) {
                errors.add(new Violation(path(field), "is required"));
                return 1;
            }
            return integer(field, 1);
        }

        List<Integer> integers(String field) {
            JsonNode value = node.get(field);
            if (absent(value) || !value.isArray()) {
                errors.add(new Violation(path(field), "must be a list of whole numbers"));
                return List.of();
            }
            List<Integer> result = new ArrayList<>();
            for (JsonNode item : value) {
                if (!item.isIntegralNumber()) {
                    errors.add(new Violation(path(field), "must be a list of whole numbers"));
                    return List.of();
                }
                result.add(item.intValue());
            }
            return result;
        }

        LocalTime time(String field) {
            return parseTime(node.get(field), path(field));
        }

        LocalTime requiredTime(String field) {
            if (absent(node.get(field))) {
                errors.add(new Violation(path(field), "is required"));
                return LocalTime.MIDNIGHT;
            }
            LocalTime time = time(field);
            return time == null ? LocalTime.MIDNIGHT : time;
        }

        private LocalTime parseTime(JsonNode value, String path) {
            if (absent(value)) {
                return null;
            }
            String text = value.asText();
            if (!value.isTextual() || !TIME.matcher(text).matches()) {
                errors.add(new Violation(path, "must be a time like 21:00"));
                return null;
            }
            try {
                return LocalTime.parse(text, TIME_FORMAT);
            } catch (DateTimeParseException e) {
                errors.add(new Violation(path, "must be a time like 21:00"));
                return null;
            }
        }

        List<LocalTime> slots(String field) {
            JsonNode value = node.get(field);
            if (absent(value)) {
                return List.of();
            }
            if (!value.isArray()) {
                errors.add(new Violation(path(field), "must be a list of {\"by\": \"HH:mm\"}"));
                return List.of();
            }
            List<LocalTime> result = new ArrayList<>();
            for (int i = 0; i < value.size(); i++) {
                JsonNode slot = value.get(i);
                String slotPath = path(field) + "[" + i + "].by";
                if (!slot.isObject() || absent(slot.get("by"))) {
                    errors.add(new Violation(slotPath, "is required"));
                    continue;
                }
                LocalTime by = parseTime(slot.get("by"), slotPath);
                if (by != null) {
                    result.add(by);
                }
            }
            return result;
        }

        Set<DayOfWeek> days(String field) {
            JsonNode value = node.get(field);
            if (absent(value)) {
                return Set.of();
            }
            if (!value.isArray()) {
                errors.add(new Violation(path(field), "must be a list like [\"MON\", \"TUE\"]"));
                return Set.of();
            }
            Set<DayOfWeek> result = EnumSet.noneOf(DayOfWeek.class);
            for (JsonNode item : value) {
                DayOfWeek day = DAY_CODES.get(item.asText());
                if (day == null) {
                    errors.add(new Violation(path(field), "unknown day '" + item.asText() + "', use MON..SUN"));
                } else {
                    result.add(day);
                }
            }
            return result;
        }

        DayOfWeek day(String field, DayOfWeek fallback) {
            JsonNode value = node.get(field);
            if (absent(value)) {
                return fallback;
            }
            DayOfWeek day = DAY_CODES.get(value.asText());
            if (day == null) {
                errors.add(new Violation(path(field), "unknown day '" + value.asText() + "', use MON..SUN"));
                return fallback;
            }
            return day;
        }

        private static boolean absent(JsonNode value) {
            return value == null || value.isNull();
        }

        private static String path(String field) {
            return ROOT + "." + field;
        }
    }

    // ---- encoding -------------------------------------------------------------------------

    public String toJson(Schedule schedule) {
        try {
            return mapper.writeValueAsString(encode(schedule));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("cannot serialize schedule", e);
        }
    }

    public ObjectNode encode(Schedule schedule) {
        ObjectNode node = mapper.createObjectNode();
        node.put("type", schedule.type().name());
        switch (schedule) {
            case CheckSchedule check -> {
                node.put("recurrence", check.recurrence().name());
                ArrayNode days = node.putArray("days");
                check.days().stream().sorted().forEach(day -> days.add(dayCode(day)));
                node.put("deadline", formatTime(check.deadline()));
                node.put("dueSoonMinutes", check.dueSoonMinutes());
            }
            case MeterSchedule meter -> {
                if (meter.hasExplicitSlots()) {
                    ArrayNode slots = node.putArray("slots");
                    meter.slots().forEach(by -> slots.addObject().put("by", formatTime(by)));
                } else {
                    node.put("count", meter.count());
                    node.put("firstBy", formatTime(meter.firstBy()));
                    if (meter.lastBy() != null) {
                        node.put("lastBy", formatTime(meter.lastBy()));
                    }
                }
                if (meter.minGapMinutes() > 0) {
                    node.put("minGapMinutes", meter.minGapMinutes());
                }
            }
            case QuotaSchedule quota -> {
                node.put("timesPerWeek", quota.timesPerWeek());
                node.put("weekStarts", dayCode(quota.weekStarts()));
            }
            case FreshnessSchedule freshness -> {
                ArrayNode thresholds = node.putArray("thresholdsDays");
                freshness.thresholdsDays().forEach(thresholds::add);
            }
        }
        return node;
    }

    private static String formatTime(LocalTime time) {
        return time.format(TIME_FORMAT);
    }

    private static String dayCode(DayOfWeek day) {
        return day.name().substring(0, 3);
    }
}
