import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry, SelectEntry } from '@bpmn-io/properties-panel';
import { SPIFFWORKFLOW_XML_NAMESPACE } from '../../constants';

let serviceTaskOperators = [];

const previouslyUsedServiceTaskParameterValuesHash = {};

const SERVICE_TASK_OPERATOR_ELEMENT_NAME = `${SPIFFWORKFLOW_XML_NAMESPACE}:ServiceTaskOperator`;
const SERVICE_TASK_PARAMETERS_ELEMENT_NAME = `${SPIFFWORKFLOW_XML_NAMESPACE}:Parameters`;
const SERVICE_TASK_PARAMETER_ELEMENT_NAME = `${SPIFFWORKFLOW_XML_NAMESPACE}:Parameter`;

function requestServiceTaskOperators(eventBus, element, commandStack) {
  eventBus.fire('spiff.service_tasks.requested', { eventBus });
  eventBus.on('spiff.service_tasks.returned', (event) => {
    if (event.serviceTaskOperators.length > 0) {
      serviceTaskOperators = event.serviceTaskOperators;
    }
  });
}

function getServiceTaskOperatorModdleElement(shapeElement) {
  const { extensionElements } = shapeElement.businessObject;
  if (extensionElements) {
    return extensionElements.values.find(ee => ee.$type === SERVICE_TASK_OPERATOR_ELEMENT_NAME) || null;
  }
  return null;
}

function getServiceTaskParameterModdleElements(shapeElement) {
  const serviceTaskOperatorModdleElement = getServiceTaskOperatorModdleElement(shapeElement);
  return serviceTaskOperatorModdleElement?.parameterList?.parameters || [];
}

export function ServiceTaskOperatorSelect(props) {
  const { element, commandStack, translate, moddle } = props;

  const debounce = useService('debounceInput');
  const eventBus = useService('eventBus');

  if (!serviceTaskOperators.length) {
    requestServiceTaskOperators(eventBus, element, commandStack);
  }

  const getValue = () => {
    const serviceTaskOperatorModdleElement = getServiceTaskOperatorModdleElement(element);
    return serviceTaskOperatorModdleElement?.id || '';
  };

  const setValue = (value) => {
    if (!value) return;

    const serviceTaskOperator = serviceTaskOperators.find(sto => sto.id === value);
    if (!serviceTaskOperator) {
      console.error(`Could not find service task operator with id: ${value}`);
      return;
    }

    if (!previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id]) {
      previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id] = {};
    }

    const previouslyUsedServiceTaskParameterValues = previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id][value];
    const { businessObject } = element;
    let extensions = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');

    const oldServiceTaskOperatorModdleElement = getServiceTaskOperatorModdleElement(element);
    const newServiceTaskOperatorModdleElement = moddle.create(SERVICE_TASK_OPERATOR_ELEMENT_NAME);
    newServiceTaskOperatorModdleElement.id = value;

    let newParameterList = previouslyUsedServiceTaskParameterValues || moddle.create(SERVICE_TASK_PARAMETERS_ELEMENT_NAME);
    if (!previouslyUsedServiceTaskParameterValues) {
      newParameterList.parameters = serviceTaskOperator.parameters.map(stoParameter => {
        const newParameterModdleElement = moddle.create(SERVICE_TASK_PARAMETER_ELEMENT_NAME);
        newParameterModdleElement.id = stoParameter.id;
        newParameterModdleElement.type = stoParameter.type;
        return newParameterModdleElement;
      });

      previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id][value] = newParameterList;
      if (oldServiceTaskOperatorModdleElement) {
        previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id][oldServiceTaskOperatorModdleElement.id] = oldServiceTaskOperatorModdleElement.parameterList;
      }
    }

    newServiceTaskOperatorModdleElement.parameterList = newParameterList;
    extensions.values = extensions.get('values').filter(extValue => extValue.$type !== SERVICE_TASK_OPERATOR_ELEMENT_NAME);
    extensions.values.push(newServiceTaskOperatorModdleElement);
    businessObject.extensionElements = extensions;

    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: businessObject,
      properties: {},
    });
  };

  const getOptions = (searchTerm = "") => {
    if (!Array.isArray(serviceTaskOperators) || !serviceTaskOperators.length) return [];

    const groupedOptions = {
      "Messaging": [],
      "Dial": [],
      "Data Processing": [],
      "Spark": [],
      "Utility Tasks": [],
      "Others": []
    };

    serviceTaskOperators.forEach((sto) => {
      if (!sto.id) return;
      const lowerId = sto.id.toLowerCase();
      let category = "Others";

      if (lowerId.includes("slack") || lowerId.includes("email")) {
        category = "Messaging";
      } else if (lowerId.includes("dial")) {
        category = "Dial";
      } else if (lowerId.includes("http")) {
        category = "Data Processing";
      } else if (lowerId.includes("spark")) {
        category = "Spark";
      } else if (lowerId.includes("utility") || lowerId.includes("generic")) {
        category = "Utility Tasks";
      }

      if (searchTerm === "" || lowerId.includes(searchTerm.toLowerCase())) {
        groupedOptions[category].push({ label: sto.id, value: sto.id });
      }
    });

    let categorizedOptions = [];

    Object.entries(groupedOptions)
      .filter(([_, options]) => options.length > 0)
      .forEach(([category, options]) => {
        categorizedOptions.push({ label: `--- ${category} ---`, value: "", disabled: true });
        categorizedOptions = categorizedOptions.concat(options);
      });

    return categorizedOptions.length > 0 ? categorizedOptions : [{ label: "No matching results", value: "", disabled: true }];
  };

  return SelectEntry({
    id: 'selectOperatorId',
    element,
    label: translate('Operator ID'),
    getValue,
    setValue,
    getOptions: () => getOptions(),
    debounce,
  });
}

export function ServiceTaskParameterArray(props) {
  const { element, commandStack } = props;
  const serviceTaskParameterModdleElements = getServiceTaskParameterModdleElements(element);

  return {
    items: serviceTaskParameterModdleElements.map((param, index) => ({
      id: `serviceTaskParameter-${index}`,
      label: param.id,
      entries: serviceTaskParameterEntries({
        idPrefix: `serviceTaskParameter-${index}`,
        element,
        serviceTaskParameterModdleElement: param,
        commandStack,
      }),
      autoFocusEntry: `serviceTaskParameter-${index}`,
    })),
  };
}

function serviceTaskParameterEntries({ idPrefix, serviceTaskParameterModdleElement, commandStack }) {
  return [{
    idPrefix: `${idPrefix}-parameter`,
    component: ServiceTaskParameterTextField,
    serviceTaskParameterModdleElement,
    commandStack,
  }];
}

function ServiceTaskParameterTextField({ idPrefix, element, serviceTaskParameterModdleElement, commandStack }) {
  const debounce = useService('debounceInput');

  return TextFieldEntry({
    element,
    id: `${idPrefix}-textField`,
    getValue: () => serviceTaskParameterModdleElement.value || "",
    setValue: (value) => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: serviceTaskParameterModdleElement,
      properties: { value },
    }),
    debounce,
  });
}
