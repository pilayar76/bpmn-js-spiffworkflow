import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry, TextAreaEntry } from '@bpmn-io/properties-panel';
import { removeFirstInstanceOfItemFromArrayInPlace } from '../../helpers';

const getScriptUnitTestsModdleElement = (shapeElement) => {
  const bizObj = shapeElement.businessObject;
  if (!bizObj.extensionElements) {
    return null;
  }
  if (!bizObj.extensionElements.values) {
    return null;
  }
  return bizObj.extensionElements
    .get('values')
    .filter(function getInstanceOfType(e) {
      return e.$instanceOf('spiffworkflow:unitTests');
    })[0];
};

const getScriptUnitTestModdleElements = (shapeElement) => {
  const scriptUnitTestsModdleElement =
    getScriptUnitTestsModdleElement(shapeElement);
  if (scriptUnitTestsModdleElement) {
    return scriptUnitTestsModdleElement.unitTests;
  }
  return [];
};

/**
 * Provides a list of data objects, and allows you to add / remove data objects, and change their ids.
 * @param props
 * @constructor
 */
export function ScriptUnitTestArray(props) {
  const { element, moddle, commandStack, translate } = props;
  const scriptUnitTestModdleElements = getScriptUnitTestModdleElements(element);
  const items = scriptUnitTestModdleElements.map(
    (scriptUnitTestModdleElement, index) => {
      const id = `scriptUnitTest-${index}`;
      return {
        id,
        label: scriptUnitTestModdleElement.id,
        entries: scriptUnitTestGroup({
          idPrefix: id,
          element,
          scriptUnitTestModdleElement,
          commandStack,
          translate,
        }),
        remove: removeFactory({
          element,
          scriptUnitTestModdleElement,
          commandStack,
          moddle,
        }),
        autoFocusEntry: id,
      };
    }
  );

  function add(event) {
    event.stopPropagation();
    const scriptTaskModdleElement = element.businessObject;
    if (!scriptTaskModdleElement.extensionElements) {
      scriptTaskModdleElement.extensionElements =
        scriptTaskModdleElement.$model.create('bpmn:ExtensionElements');
    }

    let scriptUnitTestsModdleElement = getScriptUnitTestsModdleElement(element);

    if (!scriptUnitTestsModdleElement) {
      scriptUnitTestsModdleElement = scriptTaskModdleElement.$model.create(
        'spiffworkflow:unitTests'
      );
      scriptTaskModdleElement.extensionElements
        .get('values')
        .push(scriptUnitTestsModdleElement);
    }
    const scriptUnitTestModdleElement = scriptTaskModdleElement.$model.create(
      'spiffworkflow:unitTest'
    );
    const scriptUnitTestInputModdleElement =
      scriptTaskModdleElement.$model.create('spiffworkflow:inputJson');
    const scriptUnitTestOutputModdleElement =
      scriptTaskModdleElement.$model.create('spiffworkflow:expectedOutputJson');
    scriptUnitTestModdleElement.id = moddle.ids.nextPrefixed('ScriptUnitTest_');
    scriptUnitTestInputModdleElement.value = '{}';
    scriptUnitTestOutputModdleElement.value = '{}';
    scriptUnitTestModdleElement.inputJson = scriptUnitTestInputModdleElement;
    scriptUnitTestModdleElement.expectedOutputJson =
      scriptUnitTestOutputModdleElement;
    scriptUnitTestsModdleElement.unitTests.push(scriptUnitTestModdleElement);
    commandStack.execute('element.updateProperties', {
      element,
      properties: {},
    });
  }

  return { items, add };
}

function removeFactory(props) {
  const { element, scriptUnitTestModdleElement, moddle, commandStack } = props;

  return function (event) {
    event.stopPropagation();
    const scriptUnitTestsModdleElement =
      getScriptUnitTestsModdleElement(element);
    removeFirstInstanceOfItemFromArrayInPlace(
      scriptUnitTestsModdleElement.unitTests,
      scriptUnitTestModdleElement
    );
    commandStack.execute('element.updateProperties', {
      element,
      properties: {},
    });
  };
}

// <spiffworkflow:unitTests>
//   <spiffworkflow:unitTest id="test1">
//     <spiffworkflow:inputJson>{}</spiffworkflow:inputJson>
//     <spiffworkflow:expectedOutputJson>{}</spiffworkflow:expectedOutputJson>
//   </spiffworkflow:unitTest>
// </spiffworkflow:unitTests>
function scriptUnitTestGroup(props) {
  const {
    idPrefix,
    element,
    scriptUnitTestModdleElement,
    commandStack,
    translate,
  } = props;
  return [
    {
      id: `${idPrefix}-id`,
      label: translate('ID:'),
      element,
      component: ScriptUnitTestIdTextField,
      scriptUnitTestModdleElement,
      commandStack,
    },
    {
      id: `${idPrefix}-input`,
      label: translate('Input Json:'),
      element,
      component: ScriptUnitTestJsonTextArea,
      scriptUnitTestJsonModdleElement: scriptUnitTestModdleElement.inputJson,
      commandStack,
    },
    {
      id: `${idPrefix}-expected-output`,
      label: translate('Expected Output Json:'),
      element,
      component: ScriptUnitTestJsonTextArea,
      scriptUnitTestJsonModdleElement:
        scriptUnitTestModdleElement.expectedOutputJson,
      commandStack,
    },
  ];
}

function ScriptUnitTestJsonTextArea(props) {
  const { id, element, scriptUnitTestJsonModdleElement, label } = props;

  const debounce = useService('debounceInput');
  const setValue = (value) => {
    scriptUnitTestJsonModdleElement.value = value;
  };

  const getValue = () => {
    return scriptUnitTestJsonModdleElement.value;
  };

  return TextAreaEntry({
    element,
    id: `${id}-textArea`,
    getValue,
    setValue,
    debounce,
    label,
  });
}

function ScriptUnitTestIdTextField(props) {
  const { id, element, scriptUnitTestModdleElement, label } = props;

  const debounce = useService('debounceInput');
  const commandStack = useService('commandStack');

  const setValue = (value) => {
    scriptUnitTestModdleElement.id = value;
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: scriptUnitTestModdleElement,
      properties: {},
    });
  };

  const getValue = () => {
    return scriptUnitTestModdleElement.id;
  };

  return TextFieldEntry({
    element,
    id: `${id}-textArea`,
    getValue,
    setValue,
    debounce,
    label,
  });
}
