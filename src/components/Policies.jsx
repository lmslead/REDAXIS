import { POLICY_DOCUMENTS } from '../data/policies.js';
import './Policies.css';

const Policies = () => {
  const handleJumpToPolicy = (sectionId) => {
    if (typeof document === 'undefined') {
      return;
    }
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="policies-page">
      <div className="container py-4">
        <section className="policies-hero">
          <div>
            <p className="policies-eyebrow">Company Handbook • Updated November 2025</p>
            <h1>Operational Policies</h1>
            <p className="policies-hero__summary">
              A single source of truth for commute discipline and attendance-leave governance. Every teammate is
              accountable for understanding and practicing these guardrails.
            </p>
            <div className="policy-hero__meta">
              <span>Owned by HR & Administration</span>
              <span>Applies to all locations & shifts</span>
            </div>
          </div>
        </section>

        <div className="policy-shortcuts" aria-label="Policy quick navigation">
          {POLICY_DOCUMENTS.map((policy) => (
            <button
              key={policy.id}
              type="button"
              className="policy-shortcut-chip"
              onClick={() => handleJumpToPolicy(policy.id)}
            >
              <span>{policy.tag}</span>
              <strong>{policy.title}</strong>
            </button>
          ))}
        </div>

        <div className="policy-grid">
          {POLICY_DOCUMENTS.map((policy) => (
            <article key={policy.id} id={policy.id} className="policy-card">
              <header className="policy-card__header">
                <span className="policy-card__tag">{policy.tag}</span>
                <h2>{policy.title}</h2>
                <p>{policy.summary}</p>
                <div className="policy-card__meta">
                  <div>
                    <small>Effective Date</small>
                    <strong>{policy.effectiveDate}</strong>
                  </div>
                  <div>
                    <small>Policy Owner</small>
                    <strong>{policy.owner}</strong>
                  </div>
                  <div>
                    <small>Approved By</small>
                    <strong>{policy.approvers.join(' • ')}</strong>
                  </div>
                </div>
              </header>

              <div className="policy-highlights">
                {policy.keyHighlights.map((item) => (
                  <div key={item.label} className="policy-highlight">
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="policy-sections">
                {policy.sections.map((section) => (
                  <section key={section.title} className="policy-section">
                    <h3>{section.title}</h3>
                    {'items' in section && Array.isArray(section.items) && (
                      <ul>
                        {section.items.map((item, idx) => {
                          if (typeof item === 'string') {
                            return <li key={`${section.title}-${idx}`}>{item}</li>;
                          }

                          const typedItem = item;
                          return (
                            <li key={`${section.title}-${typedItem.text}`}>
                              <span className="policy-section__item-label">{typedItem.text}</span>
                              {Array.isArray(typedItem.subItems) && (
                                <ul className="policy-sublist">
                                  {typedItem.subItems.map((subItem, subIndex) => (
                                    <li key={`${typedItem.text}-${subIndex}`}>{subItem}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {'table' in section && section.table && (
                      <div className="policy-table" role="table" aria-label={`${section.title} reference`}>
                        <div className="policy-table__row policy-table__header" role="row">
                          {section.table.columns.map((column) => (
                            <div key={column} role="columnheader">
                              {column}
                            </div>
                          ))}
                        </div>
                        {section.table.rows.map((row) => (
                          <div key={row.status} className="policy-table__row" role="row">
                            <div role="cell">{row.status}</div>
                            <div role="cell">{row.description}</div>
                            <div role="cell">{row.impact}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {'note' in section && section.note && (
                      <div className="policy-note">{section.note}</div>
                    )}
                  </section>
                ))}
              </div>

              <div className="policy-alerts">
                {policy.alerts.map((alert) => (
                  <div key={alert.title} className={`policy-alert policy-alert--${alert.tone}`}>
                    <h4>{alert.title}</h4>
                    <p>{alert.description}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Policies;
