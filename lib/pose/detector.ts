import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";

let detectorPromise: Promise<poseDetection.PoseDetector> | null = null;

export async function getDetector(): Promise<poseDetection.PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.ready();
      try {
        await tf.setBackend("webgl");
      } catch {
        await tf.setBackend("cpu");
      }
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return detectorPromise;
}

export type Keypoint = poseDetection.Keypoint;
