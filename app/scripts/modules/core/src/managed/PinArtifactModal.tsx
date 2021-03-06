import React, { memo, useCallback } from 'react';
import ReactGA from 'react-ga';
import { Option } from 'react-select';

import {
  IModalComponentProps,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ReactSelectInput,
  FormikFormField,
  TextAreaInput,
  showModal,
  SpinFormik,
  ValidationMessage,
  Icon,
} from '../presentation';
import { HelpField } from '../help';
import { IManagedArtifactVersion, IManagedResourceSummary } from '../domain';
import { Application } from '../application';

import { ManagedWriter } from './ManagedWriter';
import { Button } from './Button';
import { EnvironmentBadge } from './EnvironmentBadge';

import { getArtifactVersionDisplayName } from './displayNames';
import { useEnvironmentTypeFromResources } from './useEnvironmentTypeFromResources.hooks';

const PINNING_DOCS_URL = 'https://www.spinnaker.io/guides/user/managed-delivery/pinning';

const logClick = (label: string, application: string) =>
  ReactGA.event({
    category: 'Environments - pin version modal',
    action: `${label} clicked`,
    label: application,
  });

const EnvironmentOption = memo(
  ({ label, disabled, allResources }: Option<string> & { allResources: IManagedResourceSummary[] }) => {
    const isCritical = useEnvironmentTypeFromResources(allResources);

    return (
      <span>
        <span className="sp-margin-s-right" style={{ opacity: disabled ? 0.66 : 1 }}>
          <EnvironmentBadge name={label} critical={isCritical} size="small" />
        </span>
        {disabled && (
          <span className="small" style={{ fontStyle: 'italic', color: '#666' }}>
            Already pinned here
          </span>
        )}
      </span>
    );
  },
);

export interface IPinArtifactModalProps extends IModalComponentProps {
  application: Application;
  reference: string;
  version: IManagedArtifactVersion;
  resourcesByEnvironment: { [environment: string]: IManagedResourceSummary[] };
}

export const showPinArtifactModal = (props: IPinArtifactModalProps) =>
  showModal(PinArtifactModal, props, { maxWidth: 628 });

export const PinArtifactModal = memo(
  ({ application, reference, version, resourcesByEnvironment, dismissModal, closeModal }: IPinArtifactModalProps) => {
    const optionRenderer = useCallback(
      (option: Option<string>) => <EnvironmentOption {...option} allResources={resourcesByEnvironment[option.value]} />,
      [resourcesByEnvironment],
    );

    return (
      <>
        <ModalHeader>Pin {getArtifactVersionDisplayName(version)}</ModalHeader>
        <SpinFormik<{
          environment: string;
          comment?: string;
        }>
          initialValues={{
            environment: version.environments.find(({ pinned }) => !pinned).name,
          }}
          onSubmit={({ environment, comment }, { setSubmitting, setStatus }) =>
            ManagedWriter.pinArtifactVersion({
              environment,
              reference,
              comment,
              application: application.name,
              version: version.version,
            })
              .then(() => closeModal())
              .catch((error: { data: { error: string; message: string } }) => {
                setSubmitting(false);
                setStatus({ error: error.data });
              })
          }
          render={({ status, isValid, isSubmitting, submitForm }) => {
            const errorTitle = status?.error?.error;
            const errorMessage = status?.error?.message;

            return (
              <>
                <ModalBody>
                  <div className="sp-padding-xl-yaxis">
                    <div className="flex-container-h sp-margin-xl-bottom">
                      <span className="flex-container-h middle sp-margin-m-right">
                        <Icon name="pin" appearance="neutral" size="large" />
                      </span>
                      <span>
                        Pinning ensures an environment uses a specific version, even if Spinnaker would've normally
                        deployed a different one. When you pin a version, it'll remain pinned until you manually unpin
                        it.{' '}
                        <a
                          target="_blank"
                          onClick={() => logClick('Pinning docs link', application.name)}
                          href={PINNING_DOCS_URL}
                        >
                          Learn more
                        </a>
                      </span>
                    </div>
                    <FormikFormField
                      name="environment"
                      label="Environment"
                      input={props => (
                        <ReactSelectInput
                          {...props}
                          options={version.environments.map(({ name, pinned }) => ({
                            label: name,
                            value: name,
                            disabled: !!pinned,
                          }))}
                          optionRenderer={optionRenderer}
                          valueRenderer={optionRenderer}
                          searchable={false}
                          clearable={false}
                        />
                      )}
                    />
                    <FormikFormField
                      label="Reason"
                      name="comment"
                      required={true}
                      input={props => <TextAreaInput {...props} rows={5} required={true} />}
                    />
                    <div className="small text-right">
                      Markdown is okay <HelpField id="markdown.examples" />
                    </div>

                    {status?.error && (
                      <div className="sp-margin-xl-top">
                        <ValidationMessage
                          type="error"
                          message={
                            <span className="flex-container-v">
                              <span className="text-bold">Something went wrong:</span>
                              {errorTitle && <span className="text-semibold">{errorTitle}</span>}
                              {errorMessage && <span>{errorMessage}</span>}
                            </span>
                          }
                        />
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter
                  primaryActions={
                    <div className="flex-container-h sp-group-margin-s-xaxis">
                      <Button onClick={() => dismissModal()}>Cancel</Button>
                      <Button appearance="primary" disabled={!isValid || isSubmitting} onClick={() => submitForm()}>
                        Pin
                      </Button>
                    </div>
                  }
                />
              </>
            );
          }}
        />
      </>
    );
  },
);
