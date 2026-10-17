/**
 * @gg/ui — shared by the GG apps (GGLeads today, ggsocial next).
 *
 * Import the styles once in the root layout:
 *   import '@gg/ui/styles.css';  // tokens and components (every app)
 *   import '@gg/ui/base.css';    // element defaults (apps without Tailwind)
 */
export * from './components';
export * from './shell';
export * from './charts';
export * from './brands';
export * from './format';
export * from './color';
export { Icon, iconNames, type IconLike, type LucideLike } from './icon';
