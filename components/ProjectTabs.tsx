'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Settings } from 'lucide-react';
import type { Project } from '@/types';

interface SortableTabProps {
  readonly project: Project;
  readonly isActive: boolean;
  readonly onClose: (id: string) => void;
  readonly onClick: (slug: string) => void;
}

function SortableTab({ project, isActive, onClose, onClick }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-1 px-4 py-2 rounded-t-lg cursor-pointer
        text-sm font-medium select-none whitespace-nowrap
        border border-b-0 transition-colors
        ${isActive
          ? 'bg-white text-gray-900 border-gray-300'
          : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700'
        }
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
      onClick={() => onClick(project.slug)}
      {...attributes}
      {...listeners}
    >
      <span>{project.name}</span>
      <button
        className="ml-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-300 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose(project.id);
        }}
        aria-label={`${project.name}を閉じる`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ProjectTabsProps {
  readonly projects: readonly Project[];
  readonly onProjectsChange: (projects: readonly Project[]) => void;
  readonly onAddProject: () => void;
}

export default function ProjectTabs({
  projects,
  onProjectsChange,
  onAddProject,
}: ProjectTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const activeSlug = pathname.split('/').filter(Boolean)[0] ?? '';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    const reordered = arrayMove([...projects], oldIndex, newIndex).map(
      (p, i) => ({ ...p, sortOrder: i })
    );
    onProjectsChange(reordered);
  }

  function handleClose(id: string) {
    if (!confirm('この案件タブを削除しますか？')) return;
    const filtered = projects.filter((p) => p.id !== id);
    onProjectsChange(filtered);

    const closed = projects.find((p) => p.id === id);
    if (closed?.slug === activeSlug && filtered.length > 0) {
      router.push(`/${filtered[0].slug}`);
    }
  }

  function handleClick(slug: string) {
    router.push(`/${slug}`);
  }

  return (
    <div className="flex items-end gap-0.5 px-2 pt-2 bg-gray-200 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          {projects.map((project) => (
            <SortableTab
              key={project.id}
              project={project}
              isActive={project.slug === activeSlug}
              onClose={handleClose}
              onClick={handleClick}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        className="flex items-center justify-center w-8 h-8 mb-0.5 rounded-full
          text-gray-500 hover:bg-gray-300 hover:text-gray-700 transition-colors"
        onClick={onAddProject}
        aria-label="案件を追加"
      >
        <Plus size={18} />
      </button>

      <div className="flex-1" />

      <button
        className="flex items-center justify-center w-8 h-8 mb-0.5 rounded-full
          text-gray-500 hover:bg-gray-300 hover:text-gray-700 transition-colors"
        onClick={() => router.push('/settings')}
        aria-label="設定"
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
