import * as ort from 'onnxruntime-node';

async function inspectOnnxModel() {
  const modelPath = 'prisml/generated/churnPredictor.onnx';
  
  console.log('Loading ONNX model from:', modelPath);
  const session = await ort.InferenceSession.create(modelPath);
  
  console.log('\n📥 Input Names:');
  session.inputNames.forEach(name => console.log('  -', name));
  
  console.log('\n📤 Output Names:');
  session.outputNames.forEach(name => console.log('  -', name));
}

inspectOnnxModel().catch(console.error);
