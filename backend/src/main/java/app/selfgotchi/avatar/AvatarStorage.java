package app.selfgotchi.avatar;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.stereotype.Component;

import app.selfgotchi.avatar.ImageGenerationProvider.Image;

/**
 * Photos and frames on local disk: {@code <storageDir>/<userId>/<avatarId>/<NAME>.<ext>}.
 * Names are fixed frame names ({@code NORMAL_NEUTRAL}, {@code TIRED_BLINK}, {@code photo}), never
 * free user input, so a path can't escape the avatar's folder.
 */
@Component
public class AvatarStorage {

    private static final Pattern NAME = Pattern.compile("[A-Za-z_]{1,32}");

    private final Path root;

    public AvatarStorage(AvatarProperties properties) {
        this.root = Path.of(properties.storageDir()).toAbsolutePath().normalize();
    }

    public void write(Avatar avatar, String name, Image image) {
        Path dir = dir(avatar);
        try {
            Files.createDirectories(dir);
            delete(avatar, name);
            Files.write(dir.resolve(checked(name) + "." + extension(image.mediaType())), image.data());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public Optional<Image> read(Avatar avatar, String name) {
        return find(avatar, name).map(file -> {
            try {
                return new Image(Files.readAllBytes(file), mediaType(file));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        });
    }

    public boolean exists(Avatar avatar, String name) {
        return find(avatar, name).isPresent();
    }

    /** The stored file's name with its extension, e.g. {@code NORMAL_NEUTRAL.webp}. */
    public Optional<String> fileName(Avatar avatar, String name) {
        return find(avatar, name).map(file -> file.getFileName().toString());
    }

    public void delete(Avatar avatar, String name) {
        find(avatar, name).ifPresent(file -> {
            try {
                Files.deleteIfExists(file);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        });
    }

    /** Removes the avatar's folder with everything in it. */
    public void deleteAll(Avatar avatar) {
        Path dir = dir(avatar);
        if (!Files.isDirectory(dir)) {
            return;
        }
        try (Stream<Path> files = Files.walk(dir)) {
            for (Path file : files.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Optional<Path> find(Avatar avatar, String name) {
        Path dir = dir(avatar);
        String prefix = checked(name) + ".";
        if (!Files.isDirectory(dir)) {
            return Optional.empty();
        }
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(file -> file.getFileName().toString().startsWith(prefix)).findFirst();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Path dir(Avatar avatar) {
        return root.resolve(String.valueOf(avatar.getUserId())).resolve(String.valueOf(avatar.getId()));
    }

    static boolean isValidName(String name) {
        return name != null && NAME.matcher(name).matches();
    }

    private static String checked(String name) {
        if (!isValidName(name)) {
            throw new IllegalArgumentException("bad avatar file name: " + name);
        }
        return name;
    }

    static String extension(String mediaType) {
        return switch (mediaType) {
            case "image/png" -> "png";
            case "image/jpeg" -> "jpg";
            case "image/webp" -> "webp";
            default -> throw new IllegalArgumentException("unsupported image type " + mediaType);
        };
    }

    static String mediaType(Path file) {
        String name = file.getFileName().toString();
        return switch (name.substring(name.lastIndexOf('.') + 1)) {
            case "png" -> "image/png";
            case "jpg" -> "image/jpeg";
            default -> "image/webp";
        };
    }

    /** The real type from the first bytes; null if it's none of PNG, JPEG, WebP. */
    static String sniff(byte[] data) {
        if (data.length >= 8 && (data[0] & 0xff) == 0x89 && data[1] == 'P' && data[2] == 'N' && data[3] == 'G') {
            return "image/png";
        }
        if (data.length >= 3 && (data[0] & 0xff) == 0xff && (data[1] & 0xff) == 0xd8 && (data[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        if (data.length >= 12 && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
            && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') {
            return "image/webp";
        }
        return null;
    }
}
