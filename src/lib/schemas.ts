import { z } from 'zod'

// ── Project ───────────────────────────────────────────────────────────────────

export const ProjectSchema = z.object({
  project_name: z.string().min(1, 'Name is required'),
  description:  z.string(),
  project_year: z.preprocess(
    v => (v === '' || v == null || (typeof v === 'number' && isNaN(v))) ? null : Number(v),
    z.number().int().min(1900).max(2100).nullable().optional(),
  ),
})
export type ProjectFormInput  = z.input<typeof ProjectSchema>
export type ProjectFormValues = z.output<typeof ProjectSchema>

// ── Classification ────────────────────────────────────────────────────────────

export const ClassificationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['category', 'tag', 'sub_category', 'origin']),
  entity_type: z.enum(['substance', 'model']),
  parent_id: z.string().optional(), 
})
export type ClassificationFormValues = z.infer<typeof ClassificationSchema>

// ── Model ─────────────────────────────────────────────────────────────────────

// src/lib/schemas.ts
export const ModelSchema = z.object({
  model_name: z.string().min(1, 'Model name is required'),
  executable_command: z.string().optional(),
  baseline_uncertainty: z.number().nullable().optional(),
  uncertainty_type: z.string().nullable().optional(),
  classification_ids: z.array(z.string()).optional(),
})

export type ModelFormValues = z.infer<typeof ModelSchema>

// ── Substance (create) ────────────────────────────────────────────────────────

export const CreateSubstanceSchema = z.object({
  nom:            z.string().min(1, 'Name is required'),
  substance_type: z.enum(['fuel', 'molecule', 'solvent', 'pseudo_component', 'blend']),
})
export type CreateSubstanceFormValues = z.infer<typeof CreateSubstanceSchema>

// ── Analysis metadata edit ────────────────────────────────────────────────────

export const EditMetaSchema = z.object({
  updated_by: z.string().min(1, 'Updated by is required'),
  project_id: z.string().optional(),
})
export type EditMetaFormValues = z.infer<typeof EditMetaSchema>

// ── Constant value edit ───────────────────────────────────────────────────────

export const ConstantValueSchema = z.object({
  value:         z.coerce.number({ error: 'Value must be a number' }),
  reported_unit: z.string().optional(),
  change_reason: z.string().min(1, 'Change reason is required'),
  updated_by:    z.string().min(1, 'Updated by is required'),
})
export type ConstantValueFormInput  = z.input<typeof ConstantValueSchema>
export type ConstantValueFormValues = z.output<typeof ConstantValueSchema>

// ── Composition link ──────────────────────────────────────────────────────────

export const CompositionSchema = z.object({
  composition_string: z.string().min(1, 'Composition string is required'),
  fraction_type:      z.enum(['mass', 'volume', 'mole']),
})
export type CompositionFormValues = z.infer<typeof CompositionSchema>

// ── Property (admin create) ───────────────────────────────────────────────────

export const CreatePropertySchema = z.object({
  property_id:   z.string().min(1, 'property_id is required'),
  property_name: z.string().min(1, 'Name is required'),
  standard_unit: z.string(),
  group_id:      z.string(),
})
export type CreatePropertyFormValues = z.infer<typeof CreatePropertySchema>

// ── Unit (admin create) ───────────────────────────────────────────────────────

export const CreateUnitSchema = z.object({
  unit_id:      z.string().min(1, 'unit_id is required'),
  symbol:       z.string().min(1, 'Symbol is required'),
  display_name: z.string(),
  quantity:     z.string(),
  si_base:      z.boolean(),
})
export type CreateUnitFormValues = z.infer<typeof CreateUnitSchema>
