import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry, SelectEntry } from '@bpmn-io/properties-panel';
import { SPIFFWORKFLOW_XML_NAMESPACE } from '../../constants';

let serviceTaskOperators = [];

// Cache service task parameters for easy retrieval
const previouslyUsedServiceTaskParameterValuesHash = {};

const SERVICE_TASK_OPERATOR_ELEMENT_NAME = `${SPIFFWORKFLOW_XML_NAMESPACE}:ServiceTaskOperator`;
const SERVICE_TASK_PARAMETERS_ELEMENT_NAME = `${SPIFFWORKFLOW_XML_NAMESPACE}:Parameters`;
const SERVICE_TASK_PARAMETER_ELEMENT_NAME = `${SPIFFWORKFLOW_XML_NAMESPACE}:Parameter`;

/**
 * Fetch available service tasks dynamically and update the list
 */
function requestServiceTaskOperators(eventBus, element, commandStack) {
  eventBus.fire('spiff.service_tasks.requested', { eventBus });
  eventBus.on('spiff.service_tasks.returned', (event) => {
    if (event.serviceTaskOperators.length > 0) {
      serviceTaskOperators = event.serviceTaskOperators;
    }
  });
}

/**
 * Get the moddle element for a selected service task operator
 */
function getServiceTaskOperatorModdleElement(shapeElement) {
  const { extensionElements } = shapeElement.businessObject;
  return extensionElements?.values?.find(ee => ee.$type === SERVICE_TASK_OPERATOR_ELEMENT_NAME) || null;
}

/**
 * Get service task parameters from moddle element
 */
function getServiceTaskParameterModdleElements(shapeElement) {
  const serviceTaskOperatorModdleElement = getServiceTaskOperatorModdleElement(shapeElement);
  return serviceTaskOperatorModdleElement?.parameterList?.parameters || [];
}

/**
 * Component for selecting a service task operator
 */
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

    const { businessObject } = element;
    let extensions = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');

    const oldServiceTaskOperatorModdleElement = getServiceTaskOperatorModdleElement(element);

    const newServiceTaskOperatorModdleElement = moddle.create(SERVICE_TASK_OPERATOR_ELEMENT_NAME);
    newServiceTaskOperatorModdleElement.id = value;

    let newParameterList;
    if (previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id]?.[value]) {
      newParameterList = previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id][value];
    } else {
      newParameterList = moddle.create(SERVICE_TASK_PARAMETERS_ELEMENT_NAME);
      newParameterList.parameters = serviceTaskOperator.parameters.map(stoParameter => {
        const newParameterModdleElement = moddle.create(SERVICE_TASK_PARAMETER_ELEMENT_NAME);
        newParameterModdleElement.id = stoParameter.id;
        newParameterModdleElement.type = stoParameter.type;
        return newParameterModdleElement;
      });

      previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id] ||= {};
      previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id][value] = newParameterList;
      if (oldServiceTaskOperatorModdleElement) {
        previouslyUsedServiceTaskParameterValuesHash[element.businessObject.id][oldServiceTaskOperatorModdleElement.id] = oldServiceTaskOperatorModdleElement.parameterList;
      }
    }

    newServiceTaskOperatorModdleElement.parameterList = newParameterList;

    extensions.values = extensions.values.filter(extValue => extValue.$type !== SERVICE_TASK_OPERATOR_ELEMENT_NAME);
    extensions.values.push(newServiceTaskOperatorModdleElement);
    businessObject.extensionElements = extensions;

    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: businessObject,
      properties: {},
    });
  };

  const getOptions = (searchTerm = "") => {
    if (!Array.isArray(serviceTaskOperators) || serviceTaskOperators.length === 0) {
      console.error("Error: serviceTaskOperators is empty or not an array.");
      return [];
    }

    const groupedOptions = {
      "Notification": [],
      "Dial": [],
      "DNE Core": [],
      "Data Processing": [],
      "Spark Proxy": [],
      "Broker": [],
      "AWS": [],
      "3rd Party Connectors": [],
      "Database": [],
      "Utility Tasks": [],
      "Others": []
    };

    serviceTaskOperators.forEach((sto) => {
      if (!sto.id) return;

      let category = "Others";

      if (sto.id.includes("slack") || sto.id.includes("email") || sto.id.includes("smtp")) {
        category = "Notification";
      } else if (sto.id.includes("dial")) {
        category = "Dial";
      } else if (sto.id.includes("dne")) {
        category = "DNE Core";
      } else if (sto.id.includes("http")) {
        category = "Data Processing";
      } else if (sto.id.includes("spark")) {
        category = "Spark Proxy";
      } else if (sto.id.includes("kafka")) {
        category = "Broker";
      } else if (sto.id.includes("aws")) {
        category = "AWS";
      } else if (sto.id.includes("plannet")) {
        category = "3rd Party Connectors";
      } else if (sto.id.includes("mysql")) {
        category = "Database";
      } else if (sto.id.includes("utility") || sto.id.includes("generic")) {
        category = "Utility Tasks";
      }

      groupedOptions[category].push({ label: sto.id, value: sto.id });
    });

    let categorizedOptions = [];
    Object.entries(groupedOptions)
      .filter(([_, options]) => options.length > 0)
      .forEach(([category, options]) => {
        categorizedOptions.push({ label: `--- ${category} ---`, value: "", disabled: true });
        categorizedOptions = categorizedOptions.concat(options);
      });

    return categorizedOptions.length > 0 ? categorizedOptions : [{ label: "No available options", value: "", disabled: true }];
  };

  return SelectEntry({
    id: 'selectOperatorId',
    element,
    label: translate('Operator ID'),
    getValue,
    setValue,
    getOptions: (searchTerm) => getOptions(searchTerm || ""),
    debounce,
  });
}
