import { useMemo, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className="w-36 text-sm text-gray-700">{label}</span>
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  )
}

function NumberInput({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-700">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="border border-gray-300 rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <span className="text-gray-500 text-sm">°C</span>
    </label>
  )
}

function RoomTemp({ name, temp, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm text-gray-700">{name}</span>
      <input
        type="number"
        step="0.1"
        value={temp}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="border border-gray-300 rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <span className="text-gray-500 text-sm">°C</span>
      <button onClick={onRemove} className="text-red-500 text-sm hover:underline">Remove</button>
    </div>
  )
}

export default function App() {
  const [motion, setMotion] = useState(true)
  const [night, setNight] = useState(true)
  const [energyHigh, setEnergyHigh] = useState(false)
  const [temps, setTemps] = useState([
    { room: 'LivingRoom', t: 17.0 },
    { room: 'Bedroom', t: 19.5 },
  ])

  const payload = useMemo(() => ({
    facts: {
      motion_detected: motion,
      night_time: night,
      temperatures: temps.map(x => [x.room, x.t]),
      energy_usage_high: energyHigh,
    }
  }), [motion, night, temps, energyHigh])

  async function post(path, body) {
    const res = await fetch(`${BACKEND}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error('Request failed')
    return res.json()
  }

  const [forward, setForward] = useState(null)
  const [backward, setBackward] = useState(null)
  const [goal, setGoal] = useState('TurnOn(Heater)')
  const [loading, setLoading] = useState(false)

  async function runForward() {
    setLoading(true)
    try {
      const data = await post('/reason/forward', payload)
      setForward(data)
    } finally { setLoading(false) }
  }

  async function runBackward() {
    setLoading(true)
    try {
      const data = await post('/reason/backward', { ...payload, goal })
      setBackward(data)
    } finally { setLoading(false) }
  }

  function addRoom() {
    const name = prompt('Room name?')
    if (!name) return
    setTemps(prev => [...prev, { room: name, t: 20 }])
  }

  function removeRoom(name) {
    setTemps(prev => prev.filter(r => r.room !== name))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 text-gray-800">
      <div className="max-w-4xl mx-auto py-10 px-6">
        <h1 className="text-3xl font-bold mb-2">Smart Home Assistant</h1>
        <p className="text-gray-600 mb-8">Forward-chaining to infer actions and backward-chaining to explain why.</p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-lg">Facts</h2>
            <Toggle label="Motion Detected" checked={motion} onChange={setMotion} />
            <Toggle label="Night Time" checked={night} onChange={setNight} />
            <Toggle label="Energy Usage High" checked={energyHigh} onChange={setEnergyHigh} />

            <div className="pt-2 border-t mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Room Temperatures</h3>
                <button onClick={addRoom} className="text-blue-600 text-sm hover:underline">Add room</button>
              </div>
              <div className="space-y-2">
                {temps.map((r, idx) => (
                  <RoomTemp
                    key={r.room}
                    name={r.room}
                    temp={r.t}
                    onChange={(v) => setTemps(prev => prev.map((x, i) => i===idx ? { ...x, t: v } : x))}
                    onRemove={() => removeRoom(r.room)}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={runForward} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Run forward</button>
              <button onClick={runBackward} className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded">Explain goal</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-lg">Queries</h2>
            <label className="text-sm text-gray-700">Goal (example: TurnOn(Heater) or TurnOn(Lights) or Alert(User))</label>
            <input value={goal} onChange={e=>setGoal(e.target.value)} className="w-full border rounded px-3 py-2" />

            <div className="pt-2 border-t mt-2 space-y-3">
              <h3 className="text-sm font-semibold">Forward chaining result</h3>
              {loading && <p className="text-sm text-gray-500">Running...</p>}
              {forward && (
                <div className="text-sm space-y-1">
                  <div><span className="font-semibold">Initial facts:</span> {forward.initial_facts.join(', ') || '—'}</div>
                  <div><span className="font-semibold">Inferred facts:</span> {forward.inferred_facts.join(', ') || '—'}</div>
                  <div><span className="font-semibold">Actions:</span> {forward.actions.join(', ') || '—'}</div>
                  <div className="pt-2">
                    <span className="font-semibold">Trace:</span>
                    <ul className="list-disc pl-6">
                      {forward.trace.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <h3 className="text-sm font-semibold mt-4">Backward chaining explanation</h3>
              {backward && (
                <div className="text-sm space-y-1">
                  <div><span className="font-semibold">Goal:</span> {backward.goal}</div>
                  <div><span className="font-semibold">Provable:</span> {String(backward.provable)}</div>
                  <div className="pt-2">
                    <span className="font-semibold">Proof:</span>
                    <ul className="list-disc pl-6">
                      {backward.proof.map((s, i) => (
                        <li key={i}>
                          <div className="font-medium">{s.goal}</div>
                          {s.rule_used && <div className="text-gray-600">Rule: {s.rule_used}</div>}
                          {s.satisfied_by.length>0 ? (
                            <div>Satisfied by: {s.satisfied_by.join(', ')}</div>
                          ) : (
                            <div className="text-red-600">Not satisfied</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
