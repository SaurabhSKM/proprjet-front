// ─────────────────────────────────────────────────────────────────────────────
// src/types/index.ts
// Single source of truth for all API response shapes.
// Mirrors the Marshmallow schemas on the backend.
// ─────────────────────────────────────────────────────────────────────────────

// ── Generic API wrapper ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  message?: string
  errors?: string[]
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number
}

// =============================================================================
// SUBSTANCES
// =============================================================================

export type SubstanceType = 'fuel' | 'molecule' | 'solvent' | 'pseudo_component'

export interface Substance {
  substance_id: string
  nom: string
  substance_type: SubstanceType
  is_breakable: boolean
}

export interface SubstanceDetail extends Substance {
  classifications?: Classification[]
}

export interface SubstanceProperty {
  property_id: string
  property_name: string
  standard_unit: string | null
  group: string
  values: PropertyValue[]
}

export interface PropertyValue {
  analysis_id: string
  constant_id: string
  value: number
  value_qualifier: string | null
  reported_unit: string | null
  method: string | null
  created_at: string
}

export interface TimelineEvent {
  analysis_id: string
  project_id: string | null
  data_source_type: string
  created_at: string | null
  created_by: string | null
  source_metadata: Record<string, unknown> | null
}

export interface LeafComposition {
  substance_id: string
  nom: string
  fraction: number
  fraction_type: string
}

// =============================================================================
// ANALYSES
// =============================================================================

export interface Analysis {
  analysis_id: string
  substance_id: string
  data_source_type: string
  source_metadata: Record<string, unknown> | null
  created_at: string | null
  created_by: string | null
  updated_by: string | null
  updated_at: string | null
}

export interface CreateAnalysisPayload {
  substance_id: string
  data_source_type: string
  source_metadata?: Record<string, unknown>
  created_by?: string
}

// =============================================================================
// VALUES
// =============================================================================

export interface ConstantValue {
  constant_id: string
  analysis_id: string
  property_id: string
  value: number
  value_qualifier: string | null
  uncertainty: number | null
  uncertainty_type: string | null
  reported_unit: string | null
  method: string | null
  created_at: string
  superseded_by: string | null
}

export interface TextValue {
  text_val_id: string
  analysis_id: string
  property_id: string
  value: string
}

export interface DataSeries {
  series_id: string
  analysis_id: string
  property_id: string
  dependent_unit: string | null
}

export interface DataPoint {
  point_id: number
  series_id: string
  independent_variables: Record<string, number> | null
  dependent_value: number
  value_qualifier: string | null
  uncertainty: number | null
}

export interface SeriesWithPoints extends DataSeries {
  points: DataPoint[]
}

export interface AddConstantPayload {
  property_id: string
  value: number
  reported_unit?: string
  method?: string
  uncertainty?: number
  uncertainty_type?: string
}

export interface AddSeriesPayload {
  property_id: string
  dependent_unit?: string
}

export interface AddPointsPayload {
  points: {
    independent_variables: Record<string, number>
    dependent_value: number
    uncertainty?: number
  }[]
}

// =============================================================================
// CLASSIFICATIONS
// =============================================================================

export type ClassificationRole = 'category' | 'sub_category' | 'tag' | 'origin'
export type ClassificationEntityType = 'substance' | 'model' | 'analysis'

export interface Classification {
  classification_id: string
  name: string
  entity_type: ClassificationEntityType
  role: ClassificationRole
  children?: Classification[]
  parent_id?: string | null
}

export interface AddClassificationPayload {
  name: string
  entity_type: ClassificationEntityType
  role: ClassificationRole
  parent_id?: string
}

// =============================================================================
// PROPERTIES & UNITS
// =============================================================================

export interface PropertyGroup {
  id: string
  name: string
}

export interface PropertyDefinition {
  property_id: string
  group_id: string
  property_name: string
  standard_unit: string | null
}

export interface Unit {
  unit_id: string
  symbol: string
  display_name: string
  quantity: string
  si_base: boolean
}

export interface UnitConversion {
  from_unit_id: string
  to_unit_id: string
  factor: number
  conversion_offset: number
}

export interface ConvertPayload {
  value: number
  from_symbol: string
  to_symbol: string
}

export interface ConvertResult {
  result: number
  from_unit: string
  to_unit: string
}

// =============================================================================
// MODELS
// =============================================================================

export interface Model {
  model_id: string
  model_name: string
  executable_command: string | null
  baseline_uncertainty: number | null
  uncertainty_type: string | null
}

export interface ModelIO {
  inputs: { input_name: string; input_unit: string | null; is_required: boolean }[]
  outputs: { property_id: string; output_unit: string | null; notes: string | null }[]
}

export interface CreateModelPayload {
  model_id?: string 
  model_name: string
  executable_command: string | null
  baseline_uncertainty: number | null
  uncertainty_type: string | null
  classification_ids?: string[]
}

// =============================================================================
// ADMIN / INJECTION
// =============================================================================

export interface GcxgcWarning {
  name: string
  gcxgc_total: number
}

export interface InjectionResult {
  message?: string
  rows_processed?: number
  rows_failed?: number
  errors?: string[]
  gcxgc_warnings?: GcxgcWarning[]
}

export interface DbStatus {
  substances: number
  analyses: number
  constant_values: number
  text_values: number
  data_series: number
  data_points: number
  chemical_families: number
  gcxgc_bins: number
  gcxgc_compositions: number
  ml_model_artifacts: number
  substances_by_type: Record<string, number>
  gcxgc_bins_per_family: Record<string, number>
}

// =============================================================================
// OPTIMIZER (used later — defined here for completeness)
// =============================================================================

export interface PoolSubstance {
  substance_id: string
  nom: string
  substance_type: SubstanceType
}

export interface DataCompleteness {
  name: string
  has_density: boolean
  has_fp: boolean
  has_mw: boolean
  has_kv_p40: boolean
  has_kv_m20: boolean
  has_kv_m40: boolean
  has_gcxgc: boolean
  npara_pct: number
  isopara_pct: number
  cyclo_pct: number
  arom_pct: number
  has_lhv: boolean
  has_frzp: boolean
  has_surft: boolean
  has_cp: boolean
  has_dist: boolean
  has_eos: boolean
  missing_fields: string[]
}

export interface ComputedProperties {
  density_sv_g_ml: number | null
  density_linear_g_ml: number | null
  density_gcgc_g_ml: number | null
  fp_mi_degC: number | null
  fp_linear_degC: number | null
  kv_p40_zhmud: number | null
  kv_p40_lechat: number | null
  kv_p40_linear: number | null
  kv_p20_regression: number | null
  kv_m20_regression: number | null
  kv_m20_linear: number | null
  kv_m40_regression: number | null
  kv_m40_linear: number | null
  surft_25_rho_mn_m: number | null
  surft_25_rho_fp_mn_m: number | null
  surft_10_linear: number | null
  surft_20_linear: number | null
  surft_40_linear: number | null
  n_paraffins_pct: number | null
  isoparaffins_pct: number | null
  cyclopara_pct: number | null
  aromatics_pct: number | null
  mw_linear: number | null
  cmass: number | null
  cmass_ratio_linear: number | null
  hmass_linear: number | null
  hc_mass_linear: number | null
  s_ppmm_linear: number | null
  lhv_linear: number | null
  cn_linear: number | null
  ait_linear: number | null
  lfl100_lechat: number | null
  ufl100_lechat: number | null
  frzp_linear: number | null
  cp_0_linear: number | null
  cp_20_linear: number | null
  cp_40_linear: number | null
  dist_ibp_linear: number | null
  dist_t10_linear: number | null
  dist_t50_linear: number | null
  dist_t90_linear: number | null
  dist_fbp_linear: number | null
}

export interface OptimizationResult {
  result_id: string
  result_name: string
  composition: Record<string, number>
  computed_properties: ComputedProperties
  eos_distillation_pts: Record<string, number> | null
  eos_pvap_pts: Record<string, number> | null
  eos_distillation_curve: DistillationPoint[] | null
  eos_pvap_curve: PvapPoint[] | null
  objective_value: number
  converged: boolean
  sparsity_desc: string | null
}

export interface OptimizationRun {
  run_id: string
  project_id: string | null
  run_name: string
  run_type: string
  scenario: string | null
  pool_substance_ids: string[]
  targets: Record<string, number>
  constraints: Record<string, unknown> | null
  created_at: string
  created_by: string
  n_results?: number
  results?: OptimizationResult[]
}

export interface DistillationPoint {
  Vpct: number
  T_C: number
  T_K: number
  Vfrac: number
}

export interface PvapPoint {
  T_C: number
  Pvap_kPa: number
}


export interface DataReference {
  reference_id: string
  reference_type: string
  title?: string | null
  authors?: string | null
  year?: number | null
  source?: string | null
  url?: string | null
  doi?: string | null
  notes?: string | null
  confidentiality?: string | null
  type?: string | null
  journal?: string | null
  issue?: string | null
  created_at?: string | null
  created_by?: string | null 
}

export interface Method {
  method_id: string
  method_name: string
  standard_body?: string | null
  description?: string | null
  reference_id?: string | null
}

export interface UsageItem {
  constant_id?: string
  value_id?: string
  kind?: string
  substance_id: string
  property_name: string
  value: number | string
}

export interface SimilarSubstanceResult {
  substance_id: string;
  name: string;
  cosine_distance: number;
  similarity_score: number;
}