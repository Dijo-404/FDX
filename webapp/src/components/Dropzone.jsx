import { useRef, useState } from "react";
import Icon from "./Icon";
import "./Dropzone.css";

export default function Dropzone({ title, hint, accept, multiple = true, onFiles }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);

  function addFiles(fileList) {
    const list = Array.from(fileList);
    setFiles((prev) => [...list, ...prev]);
    onFiles?.(list);
  }

  return (
    <div className="dropzone-block">
      <div
        className={`dropzone-area${dragOver ? " dragover" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
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
              <span className="dropzone-file-size">{(file.size / 1024).toFixed(0)} KB</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
