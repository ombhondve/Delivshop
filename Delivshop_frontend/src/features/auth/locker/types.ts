export type LockerState =
  | 'checking-session'
  | 'login-close-up'
  | 'camera-pullback'
  | 'authenticating'
  | 'authentication-failed'
  | 'camera-return'
  | 'authentication-success'
  | 'unlocking'
  | 'door-opening'
  | 'entering-room'
  | 'dashboard-transition'
  | 'dashboard-ready';

export interface CameraWaypoint {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}
