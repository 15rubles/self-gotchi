import { useState } from "react";
import { Link } from "react-router";
import { NewHabitLink } from "./NewHabitLink";
import { useTasks } from "../api/hooks";
import type { TaskDefinition } from "../api/types";
import { effectEmoji } from "../lib/format";
import { ListSection, PageTitle, Switch } from "../ui/ListSection";
import { LIST_COLORS, rowBodyClass, type ListColor } from "../ui/listStyles";
import { TYPE_INFO, describeSchedule } from "./taskForm";
import { ChevronRightIcon } from "../ui/Icons";

/** Habit definitions in the same Reminders style as the home screen: physical, mental, archived. */
export function TasksPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: tasks, isPending, error, refetch } = useTasks(showArchived);

  const sections: {
    id: string;
    title: string;
    color: ListColor;
    items: TaskDefinition[];
  }[] = [
    {
      id: "physical",
      title: "Physical",
      color: LIST_COLORS.green,
      items: tasks?.filter((t) => t.active && t.category === "PHYSICAL") ?? [],
    },
    {
      id: "mental",
      title: "Mental",
      color: LIST_COLORS.purple,
      items: tasks?.filter((t) => t.active && t.category === "MENTAL") ?? [],
    },
    {
      id: "archived",
      title: "Archived",
      color: LIST_COLORS.gray,
      items: tasks?.filter((t) => !t.active) ?? [],
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Habits"
        action={
          <NewHabitLink />
        }
      />

      {isPending && <p className="px-1 text-label-2">Loading…</p>}
      {error && (
        <p className="px-1 text-label-2">
          Couldn't load habits.{" "}
          <button type="button" onClick={() => refetch()} className="text-tint">
            Try again
          </button>
        </p>
      )}
      {tasks && tasks.length === 0 && (
        <p className="rounded-xl bg-card p-6 text-center text-label-2 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          No habits yet. Add your first one.
        </p>
      )}

      {sections.map(({ id, title, color, items }) =>
        items.length === 0 ? null : (
          <ListSection
            key={id}
            id={`habits-${id}`}
            title={title}
            color={color}
            count={items.length}
          >
            {items.map((task) => (
              <HabitRow key={task.id} task={task} color={color} />
            ))}
          </ListSection>
        ),
      )}

      <Switch
        checked={showArchived}
        onChange={setShowArchived}
        label="Show archived"
      />
    </div>
  );
}

function HabitRow({ task, color }: { task: TaskDefinition; color: ListColor }) {
  return (
    <li className="group">
      <Link
        to={`/tasks/${task.id}`}
        className="flex items-stretch hover:bg-fill active:bg-fill"
      >
        <span className="grid w-14 shrink-0 place-items-center" aria-hidden>
          <span
            className="grid size-[30px] place-items-center rounded-full text-base"
            style={{ backgroundColor: `${color.ring}26` }}
          >
            {effectEmoji[task.effectKey]}
          </span>
        </span>
        <span className={rowBodyClass}>
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[17px] leading-snug ${task.active ? "text-label" : "text-label-3"}`}
            >
              {task.name}
            </span>
            <span className="block truncate text-[15px] leading-snug text-label-2">
              {TYPE_INFO[task.type].title} · {describeSchedule(task.schedule)}
            </span>
          </span>
          <ChevronRightIcon size={16} className="text-label-3" />
        </span>
      </Link>
    </li>
  );
}
