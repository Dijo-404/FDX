import { useRef, useState } from "react";
import Icon from "./Icon";
import "./Dropzone.css";

export default function Dropzone({
  title,
  hint,
  accept,
  multiple = true,
  directory = false,
  allowDirectory = false,
  disabled = false,
  value,
  onFiles,
}) {
  const inputRef = useRef(null);
  const directoryInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);
  const files = value ?? localFiles;

  function addFiles(fileList) {
    if (disabled) return;
    const list = Array.from(fileList);
    const update = (previous) => {
      const next = multiple ? [...list, ...previous] : list.slice(0, 1);
      onFiles?.(next);
      return next;
    };
    if (value === undefined) setLocalFiles(update);
    else update(files);
  }

  return (
    <div className="dropzone-block">
      <div
        className={`dropzone-area${dragOver ? " dragover" : ""}${disabled ? " disabled" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
        onClick={
          allowDirectory
            ? undefined
            : () => !disabled && inputRef.current?.click()
        }
        onKeyDown={
          allowDirectory
            ? undefined
            : (event) => {
                if (!disabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }
        }
        role={allowDirectory ? "group" : "button"}
        tabIndex={allowDirectory ? undefined : 0}
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          webkitdirectory={directory ? "" : undefined}
          directory={directory ? "" : undefined}
          hidden
          onChange={(event) => {
            if (event.target.files.length) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {allowDirectory ? (
          <input
            ref={directoryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled}
            webkitdirectory=""
            directory=""
            hidden
            onChange={(event) => {
              if (event.target.files.length) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        ) : null}
        <Icon name="upload" size={22} />
        <strong>{title}</strong>
        <span>{hint}</span>
        {allowDirectory ? (
          <div className="dropzone-actions">
            <button
              type="button"
              className="dropzone-action primary"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Choose files
            </button>
            <button
              type="button"
              className="dropzone-action"
              disabled={disabled}
              onClick={() => directoryInputRef.current?.click()}
            >
              Choose folder
            </button>
          </div>
        ) : null}
      </div>

      {files.length > 0 ? (
        <ul className="dropzone-file-list">
          {files.slice(0, 5).map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span>{file.name}</span>
              <span className="dropzone-file-size">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </li>
          ))}
          {files.length > 5 ? (
            <li className="dropzone-more-files">
              <span>+ {files.length - 5} more files</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
