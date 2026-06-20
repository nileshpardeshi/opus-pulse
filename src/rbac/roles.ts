import type { Role, RoleKey } from '../types';

export const ROLES: Record<RoleKey, Role> = {
  cdo: {
    key: 'cdo',
    name: 'Chief Delivery Officer',
    description: 'Portfolio margin health, conversion strategy, forecasts',
    can: { salary: true, margin: true, clientRate: true, marketplace: true, attrition: true, approve: true, admin: false },
  },
  finance: {
    key: 'finance',
    name: 'Finance Controller',
    description: 'Loaded cost, margin, revenue recognition, FX',
    can: { salary: true, margin: true, clientRate: true, marketplace: true, attrition: true, approve: true, admin: false },
  },
  account: {
    key: 'account',
    name: 'Account / Engagement Manager',
    description: 'Bill rates, proposals, comparison packs',
    can: { salary: false, margin: true, clientRate: true, marketplace: false, attrition: false, approve: false, admin: false },
  },
  delivery: {
    key: 'delivery',
    name: 'Delivery / Project Manager',
    description: 'Capacity, velocity, allocation, sizing (no salary)',
    can: { salary: false, margin: false, clientRate: false, marketplace: false, attrition: false, approve: false, admin: false },
  },
  bid: {
    key: 'bid',
    name: 'Bid / Pricing Manager',
    description: 'Outcome pricing, what-if, win-rate',
    can: { salary: false, margin: true, clientRate: true, marketplace: true, attrition: false, approve: false, admin: false },
  },
  hr: {
    key: 'hr',
    name: 'HR / Workforce Admin',
    description: 'Employee data, leave, calendars (salary admin)',
    can: { salary: true, margin: false, clientRate: false, marketplace: false, attrition: true, approve: false, admin: false },
  },
  admin: {
    key: 'admin',
    name: 'System Admin',
    description: 'RBAC, integrations, audit (no business data by default)',
    can: { salary: false, margin: false, clientRate: false, marketplace: false, attrition: false, approve: false, admin: true },
  },
};

export const ROLE_LIST: Role[] = Object.values(ROLES);
