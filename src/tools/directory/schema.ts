/**
 * Directory: the company's user accounts, security groups and IT assets, as
 * IT support manages them every day (joiners, movers and leavers, lockouts,
 * password and MFA resets, laptops and phones). Every change is written to
 * an audit log, as real identity systems do.
 */
import { z } from 'zod'

const Id = z.string().min(1).max(60)
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const UserSchema = z.object({
  id: Id,
  name: z.string().min(1).max(100),
  /** Sign-in name, e.g. "maya.patel". */
  username: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .max(60),
  department: z.string().max(60),
  title: z.string().max(80),
  status: z.enum(['active', 'disabled']),
  /** Locked after too many wrong passwords. */
  locked: z.boolean().default(false),
  /** Multi-factor authentication registered. */
  mfa: z.boolean().default(false),
  /** Must choose a new password at the next sign-in (after a reset). */
  mustChangePassword: z.boolean().default(false),
  groups: z.array(Id).default([]),
  lastSignIn: z.string().max(40).default(''),
  /** Failed sign-ins today (shown when investigating a lockout). */
  failedSignIns: z.number().int().min(0).default(0),
  /** Where the failed sign-ins came from, e.g. "Office (10.20.1.0/24)". */
  signInLocation: z.string().max(100).default(''),
})

export const GroupSchema = z.object({
  id: Id,
  name: z.string().min(1).max(80),
  description: z.string().max(200),
  /** What membership gives access to, in plain words. */
  grants: z.string().max(200),
  /** Groups that should only have a few members, e.g. administrators. */
  privileged: z.boolean().default(false),
})

export const ASSET_TYPES = ['laptop', 'desktop', 'phone', 'monitor', 'tablet'] as const
export const ASSET_STATUSES = ['in-use', 'in-stock', 'repair', 'lost', 'retired'] as const

export const AssetSchema = z.object({
  /** Asset tag on the device, e.g. "CR-LT-0142". */
  tag: z.string().min(1).max(30),
  type: z.enum(ASSET_TYPES),
  model: z.string().max(80),
  serial: z.string().max(40),
  status: z.enum(ASSET_STATUSES),
  /** User ID, when in use. */
  assignedTo: z.string().max(60).default(''),
  purchased: DateSchema,
  warrantyEnd: DateSchema,
  notes: z.string().max(300).default(''),
})

export const AuditEntrySchema = z.object({
  /** Order of events. */
  seq: z.number().int().positive(),
  action: z.string().max(40),
  target: z.string().max(100),
  detail: z.string().max(200).default(''),
  /** Made by the player in this file (not part of the starting history). */
  byYou: z.boolean().default(true),
})

export const DirectoryStateSchema = z.object({
  domain: z.string().min(1).max(60),
  today: DateSchema,
  users: z.array(UserSchema).max(500),
  groups: z.array(GroupSchema).max(100),
  assets: z.array(AssetSchema).max(1000),
  audit: z.array(AuditEntrySchema).max(5000).default([]),
})

export type User = z.infer<typeof UserSchema>
export type Group = z.infer<typeof GroupSchema>
export type Asset = z.infer<typeof AssetSchema>
export type AssetType = (typeof ASSET_TYPES)[number]
export type AssetStatus = (typeof ASSET_STATUSES)[number]
export type AuditEntry = z.infer<typeof AuditEntrySchema>
export type DirectoryState = z.infer<typeof DirectoryStateSchema>
