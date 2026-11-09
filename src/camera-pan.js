import { Box3, MathUtils, Matrix4, Vector3 } from 'three';

// Leave a margin so the model cannot disappear behind the viewport edge.
const visibleInset = 0.78;

export function createPanLimit(model) {
  const center = new Box3().setFromObject(model).getCenter(new Vector3());
  const samples = [];
  model.traverseVisible(mesh => {
    const positions = mesh.geometry?.attributes.position;
    if (!mesh.isMesh || !positions?.count || mesh.material?.opacity === 0 || Object.hasOwn(mesh, 'raycast')) return;
    const stride = Math.ceil(positions.count / 96);
    const points = [];
    for (let index = 0; index < positions.count; index += stride) {
      points.push(new Vector3().fromBufferAttribute(positions, index));
    }
    // Sparse meshes also need surface samples when a long face fills the view.
    if (positions.count <= 96) {
      const indices = mesh.geometry.index;
      const count = indices?.count ?? positions.count;
      for (let i = 0; i + 2 < count; i += 3) {
        const a = points[indices ? indices.getX(i) : i];
        const b = points[indices ? indices.getX(i + 1) : i + 1];
        const c = points[indices ? indices.getX(i + 2) : i + 2];
        points.push(a.clone().lerp(b, 0.5), b.clone().lerp(c, 0.5), c.clone().lerp(a, 0.5));
      }
    }
    samples.push({ mesh, points });
  });

  const modelView = new Matrix4();
  const point = new Vector3();
  const correction = new Vector3();
  const cameraUp = new Vector3();

  return (camera, target) => {
    if (!samples.length) return false;
    camera.updateMatrixWorld();
    model.updateWorldMatrix(true, true);
    const slopeY = visibleInset / camera.projectionMatrix.elements[5];
    const slopeX = visibleInset / camera.projectionMatrix.elements[0];
    let shortest = Infinity;
    let shiftX = 0;
    let shiftY = 0;
    for (const { mesh, points } of samples) {
      modelView.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
      for (const sample of points) {
        point.copy(sample).applyMatrix4(modelView);
        const depth = -point.z;
        if (depth <= camera.near || depth >= camera.far) continue;
        const edgeX = slopeX * depth;
        const edgeY = slopeY * depth;
        const x = point.x - MathUtils.clamp(point.x, -edgeX, edgeX);
        const y = point.y - MathUtils.clamp(point.y, -edgeY, edgeY);
        const distance = x * x + y * y;
        if (distance === 0) return false;
        if (distance < shortest) {
          shortest = distance;
          shiftX = x;
          shiftY = y;
        }
      }
    }

    // Move camera and target together so the limit preserves orbit and zoom.
    if (shortest < Infinity) {
      correction.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(shiftX);
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
      correction.addScaledVector(cameraUp, shiftY);
    } else {
      correction.subVectors(center, target);
    }
    target.add(correction);
    camera.position.add(correction);
    camera.updateMatrixWorld();
    return true;
  };
}
