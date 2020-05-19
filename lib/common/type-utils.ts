const { nativeImage, NativeImage } = process.electronBinding('native_image');

export function isPromise (val: any) {
  return (
    val &&
    val.then &&
    val.then instanceof Function &&
    val.constructor &&
    val.constructor.reject &&
    val.constructor.reject instanceof Function &&
    val.constructor.resolve &&
    val.constructor.resolve instanceof Function
  );
}

const serializableTypes = [
  Boolean,
  Number,
  String,
  Date,
  Error,
  RegExp,
  ArrayBuffer,
  NativeImage
];

export function isSerializableObject (value: any) {
  return value === null || ArrayBuffer.isView(value) || serializableTypes.some(type => value instanceof type);
}

const objectMap = function (source: Object, mapper: (value: any) => any) {
  const sourceEntries = Object.entries(source);
  const targetEntries = sourceEntries.map(([key, val]) => [key, mapper(val)]);
  return Object.fromEntries(targetEntries);
};

export function serialize (value: any): any {
  if (value instanceof NativeImage) {
    const representations = [];
    for (const scaleFactor of value.getScaleFactors()) {
      const size = value.getSize(scaleFactor);
      const buffer = value.toBitmap({ scaleFactor });
      representations.push({ buffer, scaleFactor, size });
    }
    return { __ELECTRON_SERIALIZED_NativeImage__: true, representations };
  } else if (value instanceof Buffer) {
    return { __ELECTRON_SERIALIZED_Buffer__: true, data: value };
  } else if (Array.isArray(value)) {
    return value.map(serialize);
  } else if (isSerializableObject(value)) {
    return value;
  } else if (value instanceof Object) {
    return objectMap(value, serialize);
  } else {
    return value;
  }
}

export function deserialize (value: any): any {
  if (value && value.__ELECTRON_SERIALIZED_NativeImage__) {
    const image = nativeImage.createEmpty();
    for (const rep of value.representations) {
      const { buffer, size, scaleFactor } = rep;
      image.addRepresentation({
        buffer,
        width: size.width,
        height: size.height,
        scaleFactor
      });
    }
    return image;
  } else if (value && value.__ELECTRON_SERIALIZED_Buffer__) {
    const { buffer, byteOffset, byteLength } = value.data;
    return Buffer.from(buffer, byteOffset, byteLength);
  } else if (Array.isArray(value)) {
    return value.map(deserialize);
  } else if (isSerializableObject(value)) {
    return value;
  } else if (value instanceof Object) {
    return objectMap(value, deserialize);
  } else {
    return value;
  }
}
