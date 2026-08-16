import { useEffect } from "react";
import Badge from "../../components/Badge";
import StatCard from "../../components/StatCard";
import { usePlatform } from "../../context/PlatformContext";
import useInfiniteScroll from "../../hooks/useInfiniteScroll";
import FaceMatches from "./FaceMatches";
export default function Processing() {
  const { jobs, processingStats, refresh } = usePlatform();
  const stats = processingStats ?? {};
  const hasActiveJobs = (stats.activeJobs ?? 0) > 0;
  const jobsScroll = useInfiniteScroll(jobs, "Processing job records");

  useEffect(() => {
    if (!hasActiveJobs) return undefined;
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs, refresh]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ML pipeline</p>
          <h2>Processing & face matches</h2>
          <p>
            Monitor ingestion and review indexed identity results in one place.
          </p>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard
          icon="processing"
          label="Active jobs"
          value={stats.activeJobs ?? 0}
          hint="Queued or processing"
        />
        <StatCard
          icon="face"
          label="Unique faces"
          value={(
            stats.uniqueFaces ??
            stats.facesDetected ??
            0
          ).toLocaleString()}
          hint={`${(stats.faceDetections ?? 0).toLocaleString()} detections indexed`}
        />
        <StatCard
          icon="health"
          label="Completed"
          value={stats.completedJobs ?? 0}
          hint="Stored in PostgreSQL"
        />
        <StatCard
          icon="close"
          label="Failed"
          value={stats.failedJobs ?? 0}
          hint="Visible for retry"
        />
      </div>
      <section className="card section">
        <div className="section-head">
          <div>
            <h3>Processing jobs</h3>
            <p>Kafka worker assignments and persistent progress</p>
          </div>
        </div>
        <div
          className="service-list infinite-scroll processing-jobs-scroll"
          {...jobsScroll.scrollProps}
        >
          {jobsScroll.rows.map((job) => (
            <div className="job-row" key={job.id}>
              <div>
                <strong>
                  {job.type} · {job.photoId?.slice(0, 8)}
                </strong>
                <span>
                  {job.error || new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
              <code>{job.worker}</code>
              <Badge status={job.status} />
            </div>
          ))}
          {!jobs.length ? (
            <p className="empty-note">
              Upload event photos to create processing jobs.
            </p>
          ) : null}
        </div>
      </section>
      <FaceMatches embedded />
      <section className="card section">
        <div className="section-head">
          <div>
            <h3>Confidence policy</h3>
            <p>Conservative matching protects participant privacy</p>
          </div>
        </div>
        <div className="confidence-list">
          <div className="high">
            <strong>High confidence</strong>
            <span>≥ 85%</span>
            <p>Automatically assigned when runner-up margin is safe</p>
          </div>
          <div className="review">
            <strong>Needs review</strong>
            <span>65–84%</span>
            <p>Held for organization admin verification</p>
          </div>
          <div className="low">
            <strong>Low confidence</strong>
            <span>&lt; 65%</span>
            <p>Kept unknown and never delivered</p>
          </div>
        </div>
      </section>
    </div>
  );
}
