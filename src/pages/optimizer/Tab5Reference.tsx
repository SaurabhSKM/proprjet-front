// src/pages/optimizer/Tab5Reference.tsx

const MODELS = [
  {
    category: 'Density',
    items: [
      {
        name: 'Specific Volume (SV) Mixing',
        formula: '1/ρ_blend = Σ wᵢ/ρᵢ',
        description: 'Harmonic mean mixing rule on mass fractions. Most accurate for liquid density blending.',
        key: 'density_sv_g_ml',
      },
      {
        name: 'Linear Average',
        formula: 'ρ_blend = Σ wᵢ·ρᵢ',
        description: 'Simple mass-weighted arithmetic mean. Faster but less accurate than SV for density.',
        key: 'density_linear_g_ml',
      },
      {
        name: 'GCxGC Ridge Regression',
        formula: 'ρ = f(GCxGC matrix)',
        description: 'Ridge regression model trained on GCxGC compositional data. Requires GCxGC data in the database. Accuracy: ~0.003 g/mL.',
        key: 'density_gcgc_g_ml',
      },
    ],
  },
  {
    category: 'Flash Point',
    items: [
      {
        name: 'Mixing Index (MI) Method',
        formula: 'MI_mix = Σ wᵢ·MI_i,  MI_i = A·exp(E/T_fp,i)',
        description: 'Antoine-type vapour pressure relationship. Constants A=4.196×10⁻⁸, E=7339.47. More accurate than linear averaging for flash point.',
        key: 'fp_mi_degC',
      },
    ],
  },
  {
    category: 'Kinematic Viscosity @ +40°C',
    items: [
      {
        name: 'Zhmud (2014) Logarithmic Model',
        formula: 'A_i = 14.534·ln(ln(KV_i+0.8)) + 10.975;  A_mix = Σwᵢ·Aᵢ',
        description: 'Recommended model. Non-linear blending captures the superlinear viscosity-composition relationship.',
        key: 'kv_p40_zhmud',
      },
      {
        name: 'Le Châtelier Harmonic Mean',
        formula: '1/KV_mix = Σ wᵢ/KVᵢ',
        description: 'Harmonic mean. Secondary model for comparison.',
        key: 'kv_p40_lechat',
      },
    ],
  },
  {
    category: 'Kinematic Viscosity (Cold)',
    items: [
      {
        name: 'Log-Linear Regression (−20°C, −40°C)',
        formula: 'ln(KV) = f(ACN, n%, iso%, subfamily%)',
        description: 'Calibrated regression model using average carbon number (ACN) and family composition. Valid range: ACN 9–18, typical jet fuel composition.',
        key: 'kv_m20_regression',
      },
      {
        name: 'Linear Regression (+20°C)',
        formula: 'KV = f(ACN, n%, iso%, subfamily%)',
        description: 'Direct linear regression for the +20°C point. Calibrated independently from the cold models.',
        key: 'kv_p20_regression',
      },
    ],
  },
  {
    category: 'Surface Tension',
    items: [
      {
        name: 'Power-Law (ρ only)',
        formula: 'σ = 4.656×10⁻⁷ · ρ^1.634 × 1000',
        description: 'Density-only model. Rough estimate at ~25°C.',
        key: 'surft_25_rho_mn_m',
      },
      {
        name: 'Power-Law (ρ + FP)',
        formula: 'σ = 1000 · (1.166×10⁻⁷ · ρ^1.834 + 2.421×10⁻⁵ · T_fp)',
        description: 'Improved model using density and flash point. More accurate than ρ-only.',
        key: 'surft_25_rho_fp_mn_m',
      },
    ],
  },
  {
    category: 'Flammability Limits',
    items: [
      {
        name: 'Le Châtelier (Volume Fraction Basis)',
        formula: '1/L_mix = Σ (Vᵢ/Lᵢ)',
        description: 'Applied on volume fractions derived from blend density. Used for both LFL and UFL.',
        key: 'lfl100_lechat',
      },
    ],
  },
  {
    category: 'Linear DB Properties',
    items: [
      {
        name: 'Mass-Weighted Average',
        formula: 'P_blend = Σ wᵢ·Pᵢ',
        description: 'Applied to: LHV, CN, AIT, freeze point, H/C, H mass, S ppm, Cp at 0/20/40°C, distillation T10/T50/T90.',
        key: 'lhv_linear',
      },
    ],
  },
]

export default function Tab5Reference() {
  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ padding: '24px 32px', maxWidth: 720 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Model Reference
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 32px' }}>
          All property models used in blend computation. Each model outputs one or more keys in the computed_properties response.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {MODELS.map(group => (
            <section key={group.category}>
              <h3 style={{
                fontSize: 11, letterSpacing: '0.25em', color: 'var(--text-muted)',
                textTransform: 'uppercase', margin: '0 0 12px',
                paddingBottom: 8, borderBottom: '1px solid var(--border)',
              }}>
                {group.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {group.items.map(model => (
                  <div
                    key={model.key}
                    style={{
                      padding: 16,
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                        {model.name}
                      </h4>
                      <code style={{
                        fontSize: 10, color: 'var(--accent)',
                        background: 'var(--accent-muted)', padding: '2px 8px',
                        borderRadius: 4, fontFamily: 'JetBrains Mono, ui-monospace, monospace', flexShrink: 0,
                      }}>
                        {model.key}
                      </code>
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12,
                      color: 'var(--accent)', background: 'var(--bg-base)',
                      padding: '8px 12px', borderRadius: 4, marginBottom: 8,
                    }}>
                      {model.formula}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{model.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div style={{
          marginTop: 40, padding: 16,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 8,
        }}>
          <h3 style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            EOS Distillation
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            EOS TBP distillation uses <span style={{ color: 'var(--accent)' }}>refgenpy</span> with
            the Peng-Robinson equation of state. Each blend component is mapped to pseudo-component
            critical properties (Tc, Pc, Vc, Zc, ω, Tb) from the injected pseudo-component library.
            GCxGC composition data determines the pseudo-mixture mass fractions per (family, carbon) bin.
            Ideal or Real mixing can be selected — Real mixing uses binary interaction parameters.
          </p>
        </div>
      </div>
    </div>
  )
}
