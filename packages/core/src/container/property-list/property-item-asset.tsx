import * as Components from '@meetalva/components';
import * as Message from '@meetalva/message';
import * as MobxReact from 'mobx-react';
import * as Model from '@meetalva/model';
import * as React from 'react';
import { ViewStore } from '../../store';
import * as uuid from 'uuid';
import { FileInput, FileFormat } from '../file-input';

export interface PropertyItemAssetProps {
	property: Model.ElementProperty;
}

@MobxReact.inject('store')
@MobxReact.observer
export class PropertyItemAsset extends React.Component<PropertyItemAssetProps> {
	public render(): JSX.Element | null {
		const props = this.props as PropertyItemAssetProps & { store: ViewStore };
		const { property } = props;

		const patternProperty = property.getPatternProperty();

		if (!patternProperty) {
			return null;
		}

		const imageSrc = (property.getValue() as string | undefined) || '';
		const inputValue = imageSrc && !imageSrc.startsWith('data:') ? imageSrc : '';
		const inputType =
			imageSrc && imageSrc.startsWith('data:')
				? Components.PropertyItemAssetInputType.File
				: Components.PropertyItemAssetInputType.Url;

		const app = props.store.getApp();
		const needsInput = !app.hasFileAccess();

		return (
			<Components.PropertyItemAsset
				description={patternProperty.getDescription()}
				label={patternProperty.getLabel()}
				imageSrc={imageSrc}
				inputType={inputType}
				inputValue={inputValue}
				onInputBlur={e => props.store.commit()}
				onInputChange={e => property.setValue(e.target.value)}
				onClearClick={() => {
					property.setValue('');
					props.store.commit();
				}}
				onChooseClick={async () => {
					const app = props.store.getApp();

					const response = await app.transaction(
						{
							type: Message.MessageType.AssetReadRequest,
							id: uuid.v4(),
							payload: undefined
						},
						{ type: Message.MessageType.AssetReadResponse }
					);

					property.setValue(response.payload);
					props.store.commit();
				}}
				placeholder="Or enter URL"
				renderChoose={
					needsInput
						? () => (
								<Components.ButtonGroupButton as="label">
									Choose
									<FileInput
										accept="image/*"
										format={FileFormat.Binary}
										onChange={(result: string) => {
											property.setValue(result);
											props.store.commit();
										}}
									/>
								</Components.ButtonGroupButton>
						  )
						: undefined
				}
			/>
		);
	}
}
