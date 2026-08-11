import { faceDetectionData } from "../../lib/mockData";

export default function FaceData() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Face detection data</h2>
          <p>Matches produced by the detection pipeline for this college's events.</p>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Student</th>
              <th>Photo</th>
              <th>Confidence</th>
              <th>Matched at</th>
            </tr>
          </thead>
          <tbody>
            {faceDetectionData.map((row) => (
              <tr key={row.id}>
                <td>{row.event}</td>
                <td>{row.student}</td>
                <td>{row.photo}</td>
                <td>{(row.confidence * 100).toFixed(0)}%</td>
                <td>{row.matchedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
