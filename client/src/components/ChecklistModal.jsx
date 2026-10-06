export const CHECKLIST_GROUPS = [
  {
    name: 'Breakers',
    items: [
      'Stabilizers',
      'Engine Ignition',
      'Engine Electronics',
      'Wipers',
      'Horn',
      'Sat Compass',
      'Nautical Instruments',
      'Thrusters',
    ],
  },
  {
    name: 'Engine Room',
    items: [
      'Sea Strainers',
      'Main Engine Oil',
      'Generator Oil',
      'Main Engine Coolant',
      'Generator Coolant',
      'Transmission Oil',
    ],
  },
  {
    name: 'Navigation Electronics',
    items: ['GPS', 'Garmin', 'Computers', 'Auto Pilot'],
  },
  {
    name: 'Anchor',
    items: ['Bow Washed Down', 'Turn Off Seawater Pump Breaker'],
  },
  {
    name: 'Additional Tasks',
    items: ['Shore Power Disconnected', 'Swimstep Ladder Up', 'Thrusters Tested', 'VHF On and Set to 16'],
  },
];

export function isChecklistComplete(checked) {
  return CHECKLIST_GROUPS.every((group, gi) => group.items.every((_, ii) => checked[`${gi}-${ii}`]));
}

export default function ChecklistModal({ checked, onToggleItem, onToggleGroup, onConfirm, onClear, onClose }) {
  const allComplete = isChecklistComplete(checked);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Departure Checklist</h2>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {CHECKLIST_GROUPS.map((group, gi) => {
            const groupChecked = group.items.every((_, ii) => checked[`${gi}-${ii}`]);
            return (
              <div className="checklist-group" key={group.name}>
                <label className="checklist-group-header">
                  <input
                    type="checkbox"
                    checked={groupChecked}
                    onChange={(e) => onToggleGroup(gi, e.target.checked)}
                  />
                  {group.name}
                </label>
                <div className="checklist-items">
                  {group.items.map((item, ii) => (
                    <label className="checklist-item" key={item}>
                      <input
                        type="checkbox"
                        checked={!!checked[`${gi}-${ii}`]}
                        onChange={(e) => onToggleItem(gi, ii, e.target.checked)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClear}>
            Clear All
          </button>
          <button type="button" className="button" disabled={!allComplete} onClick={onConfirm}>
            {allComplete ? 'Done — Mark Checklist Complete' : 'Check off all items to continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
