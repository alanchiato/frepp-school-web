export type IconName = 'home' | 'school' | 'calendar' | 'people' | 'teacher' | 'student' | 'guardians' | 'check' | 'alert' | 'lock' | 'arrow' | 'chevronDown' | 'logout' | 'mail'
const paths: Record<IconName, string> = {
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  school: 'M4 21V9h6V3h4v6h6v12M2 21h20M8 13v2m0 3v1m8-6v2m0 3v1M10 21v-4h4v4M11 6h2',
  calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 11h16',
  people: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m10 11v-3a4 4 0 0 0-3-4m0-11a4 4 0 0 1 0 8',
  teacher: 'M19 21v-3a5 5 0 0 0-5-5h-4a5 5 0 0 0-5 5v3M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  student: 'm2 8 10-5 10 5-10 5-10-5m4 2v7l6 3 6-3v-7m4-2v8',
  guardians: 'M15 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m14 10v-3a4 4 0 0 0-3-4m-2-10a4 4 0 0 1 0 8',
  check: 'm5 12 4 4L19 6',
  alert: 'm12 3 10 18H2L12 3m0 6v5m0 3v1',
  lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4m-4 5v2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  logout: 'M9 3H3v18h6m5-15 6 6-6 6m-6-6h12',
  mail: 'M3 5h18v14H3zm0 0 9 8 9-8',
}
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
