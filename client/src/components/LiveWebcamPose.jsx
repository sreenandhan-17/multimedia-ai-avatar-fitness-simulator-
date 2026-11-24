/**
 * LiveWebcamPose component (alias / wrapper for CameraPanel)
 *
 * Implements:
 * - Mandatory Landmark Visibility Gate
 * - Horizontal Push-Up Posture Validation (Body Orientation Check)
 * - Strict Push-Up Repetition State Lock (FSM)
 * - Form Alert Suppression
 */
import CameraPanel from './CameraPanel';

export default CameraPanel;
export { CameraPanel as LiveWebcamPose };
