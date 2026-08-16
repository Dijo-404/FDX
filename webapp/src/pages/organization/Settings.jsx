import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import { usePlatform } from "../../context/PlatformContext";
import { api } from "../../lib/api";

const TABS = [
  { id: "profile", label: "Organization profile" },
  { id: "privacy", label: "Privacy & consent" },
  { id: "security", label: "Security" },
];

export default function Settings() {
  const { organization, updateSettings } = usePlatform();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const tabRefs = useRef([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    phone: "",
    privacyContactEmail: "",
    participantPrivacyNotice: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [securityPending, setSecurityPending] = useState(false);
  const [securityNotice, setSecurityNotice] = useState("");
  const [securityError, setSecurityError] = useState("");

  useEffect(() => {
    if (organization)
      setForm({
        contactName: organization.contactName || "",
        contactEmail: organization.contactEmail || "",
        phone: organization.phone || "",
        privacyContactEmail: organization.privacyContactEmail || "",
        participantPrivacyNotice: organization.participantPrivacyNotice || "",
      });
  }, [organization]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    const fields =
      activeTab === "profile"
        ? ["contactName", "contactEmail", "phone"]
        : ["privacyContactEmail", "participantPrivacyNotice"];
    const payload = Object.fromEntries(
      fields.map((field) => [
        field,
        field === "privacyContactEmail" && !form[field].trim()
          ? null
          : form[field].trim(),
      ]),
    );
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateSettings(payload);
      setNotice(
        activeTab === "profile"
          ? "Organization profile saved."
          : "Privacy settings saved and the consent notice version was updated when needed.",
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestPasswordReset() {
    setSecurityPending(true);
    setSecurityError("");
    setSecurityNotice("");
    try {
      const response = await api("/v2/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
      setSecurityNotice(response.data.message);
    } catch (requestError) {
      setSecurityError(requestError.message);
    } finally {
      setSecurityPending(false);
    }
  }

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  function selectTab(index) {
    setActiveTab(TABS[index].id);
    tabRefs.current[index]?.focus();
    setNotice("");
    setError("");
  }

  function handleTabKeyDown(event, index) {
    let nextIndex;
    if (["ArrowDown", "ArrowRight"].includes(event.key))
      nextIndex = (index + 1) % TABS.length;
    else if (["ArrowUp", "ArrowLeft"].includes(event.key))
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    selectTab(nextIndex);
  }

  if (!organization)
    return (
      <div className="page-state card">
        <strong>Loading organization settings…</strong>
      </div>
    );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace configuration</p>
          <h2>Settings</h2>
          <p>Organization profile and policy boundaries.</p>
        </div>
      </div>
      <div className="settings-layout">
        <div
          className="settings-nav card"
          role="tablist"
          aria-label="Organization settings"
          aria-orientation="vertical"
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-controls={`settings-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={activeTab === tab.id ? "active" : undefined}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="settings-content">
          {notice ? (
            <div className="notice success" role="status">
              <Icon name="check" size={16} /> {notice}
            </div>
          ) : null}
          {error ? (
            <div className="notice error" role="alert">
              {error}
            </div>
          ) : null}

          {activeTab === "profile" ? (
            <form
              id="settings-panel-profile"
              className="card section"
              role="tabpanel"
              aria-labelledby="settings-tab-profile"
              onSubmit={save}
            >
              <div className="section-head">
                <div>
                  <h3>Organization profile</h3>
                  <p>Displayed in participant invitations and galleries.</p>
                </div>
                <Badge status="active">{organization.type}</Badge>
              </div>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="organization-name">Organization name</label>
                  <input
                    id="organization-name"
                    value={organization.name}
                    readOnly
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-name">Primary contact</label>
                  <input
                    id="contact-name"
                    autoComplete="name"
                    maxLength="120"
                    value={form.contactName}
                    onChange={(event) =>
                      change("contactName", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-email">Contact email</label>
                  <input
                    id="contact-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      change("contactEmail", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="support-phone">Support phone</label>
                  <input
                    id="support-phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength="40"
                    value={form.phone}
                    onChange={(event) => change("phone", event.target.value)}
                  />
                </div>
              </div>
              <button
                className="btn primary settings-save"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </form>
          ) : null}

          {activeTab === "privacy" ? (
            <>
              <form
                id="settings-panel-privacy"
                className="card section"
                role="tabpanel"
                aria-labelledby="settings-tab-privacy"
                onSubmit={save}
              >
                <div className="section-head">
                  <div>
                    <h3>Participant privacy notice</h3>
                    <p>
                      Add organization-specific information to the mandatory FDX
                      biometric consent notice.
                    </p>
                  </div>
                  <Badge status="active">
                    Version {organization.privacyNoticeVersion}
                  </Badge>
                </div>
                <div className="form-grid single">
                  <div className="field">
                    <label htmlFor="privacy-contact-email">
                      Privacy contact email
                    </label>
                    <input
                      id="privacy-contact-email"
                      type="email"
                      autoComplete="email"
                      placeholder={organization.contactEmail}
                      value={form.privacyContactEmail}
                      onChange={(event) =>
                        change("privacyContactEmail", event.target.value)
                      }
                    />
                    <small>
                      If left empty, participants are directed to{" "}
                      {organization.privacyContactEmailEffective}.
                    </small>
                  </div>
                  <div className="field">
                    <label htmlFor="participant-privacy-notice">
                      Supplemental privacy notice
                    </label>
                    <textarea
                      id="participant-privacy-notice"
                      rows="6"
                      maxLength="2000"
                      value={form.participantPrivacyNotice}
                      onChange={(event) =>
                        change("participantPrivacyNotice", event.target.value)
                      }
                      placeholder="Explain your event-specific privacy contact or data-handling details."
                    />
                    <small>
                      Plain text only · {form.participantPrivacyNotice.length} /
                      2000
                    </small>
                  </div>
                </div>
                <button
                  className="btn primary settings-save"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save privacy settings"}
                </button>
              </form>
              <section className="card section">
                <div className="section-head">
                  <div>
                    <h3>Mandatory privacy boundaries</h3>
                    <p>
                      These safeguards cannot be weakened by an organization.
                    </p>
                  </div>
                </div>
                <div className="locked-policy">
                  <div>
                    <Icon name="check" size={18} />
                    <span>Explicit consent</span>
                    <strong>
                      {organization.consentRequired ? "Required" : "Optional"}
                    </strong>
                  </div>
                  <div>
                    <Icon name="health" size={18} />
                    <span>Consent policy</span>
                    <strong>{organization.consentPolicyVersion}</strong>
                  </div>
                  <div>
                    <Icon name="events" size={18} />
                    <span>Retention limit</span>
                    <strong>{organization.retentionDays} days</strong>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "security" ? (
            <section
              id="settings-panel-security"
              className="card section"
              role="tabpanel"
              aria-labelledby="settings-tab-security"
            >
              <div className="section-head">
                <div>
                  <h3>Account security</h3>
                  <p>
                    Review the active authentication policy and manage your
                    administrator account.
                  </p>
                </div>
              </div>
              {securityNotice ? (
                <div className="notice success" role="status">
                  <Icon name="check" size={16} /> {securityNotice}
                </div>
              ) : null}
              {securityError ? (
                <div className="notice error" role="alert">
                  {securityError}
                </div>
              ) : null}
              <div className="locked-policy">
                <div>
                  <Icon name="health" size={18} />
                  <span>Access token lifetime</span>
                  <strong>
                    {organization.securityPolicy.accessTokenMinutes} minutes
                  </strong>
                </div>
                <div>
                  <Icon name="events" size={18} />
                  <span>Refresh session lifetime</span>
                  <strong>
                    {organization.securityPolicy.refreshSessionDays} days
                  </strong>
                </div>
                <div>
                  <Icon name="mail" size={18} />
                  <span>Signed-in administrator</span>
                  <strong>{user.email}</strong>
                </div>
              </div>
              <div className="security-actions">
                <div>
                  <strong>Change password</strong>
                  <p>
                    Email a time-limited reset link to {user.email}. Completing
                    it revokes your active sessions.
                  </p>
                </div>
                <button
                  className="btn primary"
                  type="button"
                  disabled={securityPending}
                  onClick={requestPasswordReset}
                >
                  <Icon name="mail" size={16} />
                  {securityPending ? "Sending…" : "Send reset email"}
                </button>
              </div>
              <div className="security-actions">
                <div>
                  <strong>Current session</strong>
                  <p>End this browser session and return to the login page.</p>
                </div>
                <button className="btn" type="button" onClick={signOut}>
                  <Icon name="logout" size={16} /> Sign out
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
