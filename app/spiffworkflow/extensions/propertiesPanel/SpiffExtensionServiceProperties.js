import { useService } from 'bpmn-js-properties-panel';
import { TextFieldEntry } from '@bpmn-io/properties-panel';
import Select from 'react-select';
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
  return extensionElements?.values?.find(ee => ee.$type === SERVICE_TASK_OPERATOR_ELEMENT_NAME) || null;
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
    return serviceTaskOperatorModdleElement?.id || null;
  };

  const setValue = (selectedOption) => {
    if (!selectedOption) return;

    const value = selectedOption.value;
    const serviceTaskOperator = serviceTaskOperators.find(sto => sto.id === value);
    if (!serviceTaskOperator) {
      console.error(`Could not find service task operator with id: ${value}`);
      return;
    }

    const { businessObject } = element;
    let extensions = businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');

    extensions.values = extensions.values.filter(extValue => extValue.$type !== SERVICE_TASK_OPERATOR_ELEMENT_NAME);

    const newServiceTaskOperatorModdleElement = moddle.create(SERVICE_TASK_OPERATOR_ELEMENT_NAME);
    newServiceTaskOperatorModdleElement.id = value;

    extensions.values.push(newServiceTaskOperatorModdleElement);
    businessObject.extensionElements = extensions;

    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: businessObject,
      properties: {},
    });
  };

  const getOptions = () => {
    if (!Array.isArray(serviceTaskOperators) || serviceTaskOperators.length === 0) {
      console.error("Error: serviceTaskOperators is empty or not an array.");
      return [];
    }

    const groupedOptions = [
      { label: "Notification", options: [] },
      { label: "Dial", options: [] },
      { label: "DNE Core", options: [] },
      { label: "Data Processing", options: [] },
      { label: "Spark Proxy", options: [] },
      { label: "Broker", options: [] },
      { label: "AWS", options: [] },
      { label: "3rd Party Connectors", options: [] },
      { label: "Database", options: [] },
      { label: "Utility Tasks", options: [] },
      { label: "Others", options: [] }
    ];

    serviceTaskOperators.forEach((sto) => {
      if (!sto.id) return;

      let categoryIndex = 10;  // Default to "Others"
      if (sto.id.includes("slack") || sto.id.includes("email") || sto.id.includes("smtp")) categoryIndex = 0;
      else if (sto.id.includes("dial")) categoryIndex = 1;
      else if (sto.id.includes("dne")) categoryIndex = 2;
      else if (sto.id.includes("http")) categoryIndex = 3;
      else if (sto.id.includes("spark")) categoryIndex = 4;
      else if (sto.id.includes("kafka")) categoryIndex = 5;
      else if (sto.id.includes("aws")) categoryIndex = 6;
      else if (sto.id.includes("plannet")) categoryIndex = 7;
      else if (sto.id.includes("mysql")) categoryIndex = 8;
      else if (sto.id.includes("utility") || sto.id.includes("generic")) categoryIndex = 9;

      groupedOptions[categoryIndex].options.push({ label: sto.id, value: sto.id });
    });

    return groupedOptions.filter(group => group.options.length > 0);
  };

  return (
    <div className="bpmn-dropdown-container">
      <label className="bpmn-dropdown-label">{translate('Operator ID')}</label>
      <Select
        options={getOptions()}
        value={getOptions().flatMap(group => group.options).find(opt => opt.value === getValue()) || null}
        onChange={setValue}
        placeholder="Select an operator..."
        isSearchable={true} // ✅ Enables search
        isClearable={true}  // ✅ Allows clearing selection
        styles={{
          menu: provided => ({
            ...provided,
            maxHeight: "150px", // ✅ Enforces scrolling
            overflowY: "auto"
          }),
          control: provided => ({
            ...provided,
            cursor: "pointer"
          })
        }}
      />
    </div>
  );
}

export function ServiceTaskParameterArray(props) {
  const { element, commandStack } = props;

  const serviceTaskParameterModdleElements =
    getServiceTaskParameterModdleElements(element);
  const items = serviceTaskParameterModdleElements.map(
    (serviceTaskParameterModdleElement, index) => {
      const id = `serviceTaskParameter-${index}`;
      return {
        id,
        label: serviceTaskParameterModdleElement.id,
        entries: serviceTaskParameterEntries({
          idPrefix: id,
          element,
          serviceTaskParameterModdleElement,
          commandStack,
        }),
        autoFocusEntry: id,
      };
    }
  );
  return { items };
}

function serviceTaskParameterEntries(props) {
  const { idPrefix, serviceTaskParameterModdleElement, commandStack } = props;
  return [
    {
      idPrefix: `${idPrefix}-parameter`,
      component: ServiceTaskParameterTextField,
      serviceTaskParameterModdleElement,
      commandStack,
    },
  ];
}

function ServiceTaskParameterTextField(props) {
  const { idPrefix, element, serviceTaskParameterModdleElement, commandStack } = props;

  const debounce = useService('debounceInput');

  const setValue = (value) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: serviceTaskParameterModdleElement,
      properties: {
        value: value,
      },
    });
  };


  const getValue = () => {
    return serviceTaskParameterModdleElement.value;
  };

  return TextFieldEntry({
    element,
    id: `${idPrefix}-textField`,
    getValue,
    setValue,
    debounce,
  });
}

export function ServiceTaskResultTextInput(props) {
  const { element, translate, commandStack } = props;

  const debounce = useService('debounceInput');
  const serviceTaskOperatorModdleElement =
    getServiceTaskOperatorModdleElement(element);

  const setValue = (value) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: serviceTaskOperatorModdleElement,
      properties: {
        resultVariable: value,
      },
    });
  };

  const getValue = () => {
    if (serviceTaskOperatorModdleElement) {
      return serviceTaskOperatorModdleElement.resultVariable;
    }
    return '';
  };

  if (serviceTaskOperatorModdleElement) {
    return TextFieldEntry({
      element,
      label: translate('Response Variable'),
      description: translate(
        'response will be saved to this variable.  Leave empty to discard the response.'
      ),
      id: `result-textField`,
      getValue,
      setValue,
      debounce,
    });
  }
  return null;
}
