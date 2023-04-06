export function getLoopProperty(element, propertyName) {

  const loopCharacteristics = element.businessObject.loopCharacteristics;
  const prop = loopCharacteristics.get(propertyName);

  let value = '';
  if (typeof(prop) !== 'object') {
    value = prop;
  } else if (typeof(prop) !== 'undefined') {
    if (prop.$type === 'bpmn:FormalExpression')
      value = prop.get('body');
    else 
      value = prop.get('id');
  }
  return value;
}

export function setLoopProperty(element, propertyName, value, commandStack) {
  const loopCharacteristics = element.businessObject.loopCharacteristics;
  if (typeof(value) === 'object')
    value.$parent = loopCharacteristics;
  commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: loopCharacteristics,
    properties: {
      [propertyName]: value
    }
  });
}
