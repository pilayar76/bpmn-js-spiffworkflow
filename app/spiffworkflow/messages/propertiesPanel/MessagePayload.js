import { useService } from 'bpmn-js-properties-panel';
import { TextAreaEntry } from '@bpmn-io/properties-panel';
import {
  findMessageModdleElements,
  getMessageRefElement,
} from '../MessageHelpers';

/**
 * Allows the creation, or editing of messagePayload at the bpmn:sendTask level of a BPMN document.
 */
export function MessagePayload(props) {
  const shapeElement = props.element;
  const debounce = useService('debounceInput');

  const getMessagePayloadObject = () => {
    const { businessObject } = shapeElement;
    const taskMessage = getMessageRefElement(shapeElement);
    const messages = findMessageModdleElements(businessObject);
    if (taskMessage) {
      for (const message of messages) {
        if (message.id === taskMessage.id) {
          const { extensionElements } = message;
          if (extensionElements) {
            return message.extensionElements
              .get('values')
              .filter(function getInstanceOfType(e) {
                return e.$instanceOf('spiffworkflow:messagePayload');
              })[0];
          }
        }
      }
    }
    return null;
  };

  const getValue = () => {
    const messagePayloadObject = getMessagePayloadObject();
    if (messagePayloadObject) {
      return messagePayloadObject.messagePayload;
    }
    return '';
  };

  const setValue = (value) => {
    const { businessObject } = shapeElement;
    let messagePayloadObject = getMessagePayloadObject();
    if (!messagePayloadObject) {
      messagePayloadObject = businessObject.$model.create(
        'spiffworkflow:messagePayload'
      );
      if (!businessObject.extensionElements) {
        businessObject.extensionElements = businessObject.$model.create(
          'bpmn:ExtensionElements'
        );
      }
      businessObject.extensionElements.get('values').push(messagePayloadObject);
    }
    messagePayloadObject.messagePayload = value;
  };

  return (
    <TextAreaEntry
      id="messagePayload"
      element={shapeElement}
      description="The payload of the message."
      label="Payload"
      getValue={getValue}
      setValue={setValue}
      debounce={debounce}
    />
  );
}
