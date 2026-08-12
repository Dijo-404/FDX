import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import { systemServices } from "../../lib/mockData";

const layers = [
  { title: "Authentication", text: "Single login · JWT session · Role resolver", tone: "purple", icon: "users" },
  { title: "Admin frontends", text: "Super Admin · Organization Admin", tone: "blue", icon: "dashboard" },
  { title: "API gateway", text: "NGINX · Routing · Rate limiting", tone: "teal", icon: "health" },
  { title: "Application services", text: "FastAPI · Auth · Events · Galleries · Retention", tone: "orange", icon: "processing" },
  { title: "Data & jobs", text: "PostgreSQL · Redis · Kafka", tone: "slate", icon: "storage" },
  { title: "ML processing", text: "RetinaFace → Align → AdaFace → Matching", tone: "pink", icon: "face" },
  { title: "External services", text: "Object storage · Email · Background workers", tone: "green", icon: "delivery" },
];

export default function SystemHealth() {
  return <div className="page"><div className="page-head"><div><p className="eyebrow">Platform operations</p><h2>System health</h2><p>Infrastructure, job throughput and the FDX service architecture.</p></div><div className="live-chip"><span /> All monitors active</div></div><div className="stat-grid"><StatCard icon="health" label="API uptime" value="99.98%" hint="Last 30 days" /><StatCard icon="processing" label="Jobs in queue" value="26" hint="4 delayed" /><StatCard icon="face" label="ML throughput" value="18.4/s" hint="Faces per second" /><StatCard icon="delivery" label="Email delivery" value="98.7%" hint="Past 24 hours" /></div><div className="two-col"><section className="card section"><div className="section-head"><div><h3>Services</h3><p>Live checks from each platform dependency</p></div></div><div className="service-list">{systemServices.map((service) => <div className="service-line" key={service.name}><div><span className={`service-status ${service.status}`} /><strong>{service.name}</strong></div><span>{service.detail}</span><Badge status={service.status} /></div>)}</div></section><section className="card section"><div className="section-head"><div><h3>Job queues</h3><p>Background worker pressure</p></div></div>{[["Face detection",12,60],["Embeddings",8,40],["Matching",4,20],["Email delivery",2,10]].map(([name,value,percent]) => <div className="queue-row" key={name}><div><strong>{name}</strong><span>{value} queued</span></div><div className="progress-track"><span style={{width:`${percent}%`}} /></div></div>)}</section></div><section className="card section"><div className="section-head"><div><h3>FDX architecture</h3><p>A clean view of how authenticated traffic moves through the platform</p></div><span className="architecture-note">Tenant isolation enforced at every service</span></div><div className="architecture-flow"><div className="architecture-start">FDX</div>{layers.map((layer) => <div className={`architecture-layer ${layer.tone}`} key={layer.title}><Icon name={layer.icon} size={19} /><div><strong>{layer.title}</strong><p>{layer.text}</p></div></div>)}</div></section></div>;
}
