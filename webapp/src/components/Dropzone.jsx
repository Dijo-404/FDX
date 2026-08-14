import { useRef, useState } from "react";
import Icon from "./Icon";
import "./Dropzone.css";

export default function Dropzone({
  title,
  hint,
  accept,
  multiple = true,
  directory = false,
  disabled = false,
  value,
  onFiles,
}) {
  const inputRef = useRef(null);
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
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
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
        <Icon name="upload" size={22} />
        <strong>{title}</strong>
        <span>{hint}</span>
      </div>

      {files.length > 0 ? (
        <ul className="dropzone-file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span>{file.name}</span>
              <span className="dropzone-file-size">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
