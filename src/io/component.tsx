import type { Child } from "@dom/render";
import { type CreateDropZoneOptions, createDropZone, type DropZoneReturn } from "./dropzone";
import { createFilePicker } from "./file-picker";

export interface DropZoneComponentProps extends CreateDropZoneOptions {
  as?: string;
  class?: any;
  dragOverClass?: any;
  style?: any;
  children?: Child | ((zone: DropZoneRenderProps) => Child);
  [key: string]: any;
}

export interface DropZoneRenderProps extends DropZoneReturn {
  openPicker: () => Promise<File[]>;
}

/**
 * Headless dropzone component with fine-grained drag state, validation, and optional file picker launcher.
 */
export function DropZone(props: DropZoneComponentProps): Child {
  const {
    as: Tag = "div",
    class: className,
    dragOverClass,
    style,
    children,
    accept,
    maxSize,
    minSize,
    multiple,
    maxFiles,
    directory,
    disabled,
    onDrop,
    onDropRejected,
    onDragEnter,
    onDragLeave,
    onDragOver,
    ...rest
  } = props;

  const dropzone = createDropZone(null, {
    accept,
    maxSize,
    minSize,
    multiple,
    maxFiles,
    directory,
    disabled,
    onDrop,
    onDropRejected,
    onDragEnter,
    onDragLeave,
    onDragOver
  });

  const picker = createFilePicker({
    accept,
    multiple,
    directory
  });

  const openPicker = async () => {
    const files = await picker.open();
    if (files.length > 0) {
      if (onDrop) onDrop(files);
    }
    return files;
  };

  const bind = dropzone.bind();

  const renderProps: DropZoneRenderProps = {
    ...dropzone,
    openPicker
  };

  const computedClass = () => {
    const active = dropzone.isDraggingOver();
    return [className, active && dragOverClass ? dragOverClass : null].filter(Boolean).join(" ");
  };

  return (
    <Tag
      class={computedClass}
      data-drag-over={() => (dropzone.isDraggingOver() ? "true" : undefined)}
      style={style}
      onDragEnter={bind.onDragEnter}
      onDragLeave={bind.onDragLeave}
      onDragOver={bind.onDragOver}
      onDrop={bind.onDrop}
      {...rest}
    >
      {typeof children === "function"
        ? (children as (props: DropZoneRenderProps) => Child)(renderProps)
        : children}
    </Tag>
  );
}
