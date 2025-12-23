import { useEffect, useMemo, useState } from 'react';
import { POLICY_DOCUMENTS } from '../data/policies.js';
import './PolicyGate.css';

const DEFAULT_CHECKS = POLICY_DOCUMENTS.reduce((acc, policy) => {
  acc[policy.key] = false;
  return acc;
}, {});

const PolicyGate = ({
  open,
  onAcknowledge,
  acknowledging = false,
  errorMessage = '',
}) => {
  const [checks, setChecks] = useState(DEFAULT_CHECKS);

  useEffect(() => {
    if (open) {
      setChecks(DEFAULT_CHECKS);
    }
  }, [open]);

  const allChecked = useMemo(
    () => POLICY_DOCUMENTS.every((policy) => checks[policy.key]),
    [checks]
  );

  if (!open) {
    return null;
  }

  const handleToggle = (policyKey) => {
    setChecks((prev) => ({
      ...prev,
      [policyKey]: !prev[policyKey],
    }));
  };

  const handleSubmit = () => {
    if (!allChecked || acknowledging) {
      return;
    }
    onAcknowledge?.({ policies: checks });
  };

  return (
    <div className="policy-gate-overlay">
      <div className="policy-gate-panel" role="dialog" aria-modal="true" aria-labelledby="policyGateHeading">
        <header className="policy-gate-header">
          <p className="policy-gate-eyebrow">Mandatory acknowledgement</p>
          <h2 id="policyGateHeading">Review & Accept Policies</h2>
          <p>
            For compliance, every teammate must read and acknowledge the latest transport and attendance policies before
            accessing the workspace.
          </p>
          <a className="policy-gate-link" href="/policies" target="_blank" rel="noopener noreferrer">
            Open policy center in a new tab ↗
          </a>
        </header>

        <div className="policy-gate-content" role="document">
          {POLICY_DOCUMENTS.map((policy) => (
            <article key={policy.id} className="policy-gate-card">
              <div className="policy-gate-card__header">
                <div>
                  <span className="policy-gate-tag">{policy.tag}</span>
                  <h3>{policy.title}</h3>
                  <p>{policy.summary}</p>
                </div>
                <label className="policy-gate-checkbox">
                  <input
                    type="checkbox"
                    checked={checks[policy.key]}
                    onChange={() => handleToggle(policy.key)}
                  />
                  <span>I have read and accept this policy</span>
                </label>
              </div>
              <div className="policy-gate-sections">
                {policy.sections.map((section) => (
                  <section key={section.title}>
                    <h4>{section.title}</h4>
                    {'items' in section && Array.isArray(section.items) && (
                      <ul>
                        {section.items.map((item, idx) => {
                          if (typeof item === 'string') {
                            return <li key={`${section.title}-${idx}`}>{item}</li>;
                          }
                          const typedItem = item;
                          return (
                            <li key={`${section.title}-${typedItem.text}`}>
                              <span>{typedItem.text}</span>
                              {Array.isArray(typedItem.subItems) && (
                                <ul>
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
                      <div className="policy-gate-table">
                        <div className="policy-gate-table__row policy-gate-table__header">
                          {section.table.columns.map((column) => (
                            <div key={column}>{column}</div>
                          ))}
                        </div>
                        {section.table.rows.map((row) => (
                          <div key={row.status} className="policy-gate-table__row">
                            <div>{row.status}</div>
                            <div>{row.description}</div>
                            <div>{row.impact}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {'note' in section && section.note && (
                      <p className="policy-gate-note">{section.note}</p>
                    )}
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>

        {errorMessage && <div className="alert alert-danger mb-3">{errorMessage}</div>}

        <div className="policy-gate-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!allChecked || acknowledging}
            onClick={handleSubmit}
          >
            {acknowledging ? 'Recording acknowledgement…' : 'Acknowledge & Continue'}
          </button>
          {!allChecked && (
            <p className="policy-gate-hint">Tick every policy checkbox to unlock the workspace.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyGate;
