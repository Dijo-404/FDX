import { useState } from "react";
import Dropzone from "../../components/Dropzone";
import "./Uploads.css";

export default function Uploads() {
  const [excelStatus, setExcelStatus] = useState(null);
  const [folderStatus, setFolderStatus] = useState(null);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Upload data</h2>
          <p>Add student rosters and event photo folders for face matching.</p>
        </div>
      </div>

      <div className="two-col upload-grid">
        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Excel upload</h3>
              <p>Columns required: Email-Id, Name</p>
            </div>
          </div>
          <Dropzone
            title="Add student roster"
            hint="Drop a .xlsx or .csv file, or click to browse"
            accept=".xlsx,.xls,.csv"
            multiple={false}
            onFiles={(files) => setExcelStatus(`${files[0]?.name} queued for import`)}
          />
          {excelStatus ? <p className="upload-status">{excelStatus}</p> : null}
        </div>

        <div className="card section">
          <div className="section-head">
            <div>
              <h3>Folder upload</h3>
              <p>Event photos for face detection</p>
            </div>
          </div>
          <Dropzone
            title="Add event photos"
            hint="Drop image files, or click to browse"
            accept="image/*"
            onFiles={(files) => setFolderStatus(`${files.length} photo${files.length === 1 ? "" : "s"} queued for processing`)}
          />
          {folderStatus ? <p className="upload-status">{folderStatus}</p> : null}
        </div>
      </div>
    </div>
  );
}
