/**
 * @name ReadIndicator
 * @author tnfAngel
 * @authorLink https://github.com/Thread-Development
 * @authorId 456361646273593345
 * @description Shows a read tick when the destinatary read a message.
 * @invite 8RNAdpK
 * @version 1.0.4
 * @donate https://www.paypal.me/tnfAngelDev
 * @website https://github.com/Thread-Development/ReadIndicator/
 * @source https://github.com/Thread-Development/ReadIndicator/
 * @updateUrl https://raw.githubusercontent.com/Thread-Development/ReadIndicator/main/ReadIndicator.plugin.js
 */

module.exports = (() => {
	const { readFileSync, writeFileSync } = require('fs');

	const grabVersion = (data) => {
		return data.split('@version')[1].split('\n')[0].trim();
	};

	const config = {
		info: {
			name: 'ReadIndicator',
			author: 'tnfAngel',
			version: grabVersion(readFileSync(__filename, 'utf8')),
			description:
				'Shows a read tick when the destinatary read a message.',
			updateUrl:
				'https://raw.githubusercontent.com/Thread-Development/ReadIndicator/main/ReadIndicator.plugin.js'
		},
		changeLog: {
			added: {
				'Custom URL asset in Send View Updater Menu':
					'Now you can send custom images/gif/videos to the target',
				'Auto updater':
					'An automatic updater has been added to update to the latest version of the plugin on each start, it can be disabled from settings'
			},
			fixed: {
				'Websocket bug':
					'Fixed a bug that caused the websocket connection to continue to be established even though the plugin was disabled'
			}
		}
	};

	return !window.BDFDB_Global ||
		(!window.BDFDB_Global.loaded && !window.BDFDB_Global.started)
		? class {
				getName() {
					return config.info.name;
				}
				getAuthor() {
					return config.info.author;
				}
				getVersion() {
					return config.info.version;
				}
				getDescription() {
					return `The Library Plugin needed for ${config.info.name} is missing. Open the Plugin Settings to download it. \n\n${config.info.description}`;
				}

				downloadLibrary() {
					require('request').get(
						'https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js',
						(e, r, b) => {
							if (!e && b && r.statusCode == 200) {
								writeFileSync(
									require('path').join(
										BdApi.Plugins.folder,
										'0BDFDB.plugin.js'
									),
									b
								);
								BdApi.showToast(
									'Finished downloading BDFDB Library',
									{ type: 'success' }
								);
							} else {
								BdApi.alert(
									'Error',
									'Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library'
								);
							}
						}
					);
				}

				load() {
					if (
						!window.BDFDB_Global ||
						!Array.isArray(window.BDFDB_Global.pluginQueue)
					)
						window.BDFDB_Global = Object.assign(
							{},
							window.BDFDB_Global,
							{ pluginQueue: [] }
						);
					if (!window.BDFDB_Global.downloadModal) {
						window.BDFDB_Global.downloadModal = true;
						BdApi.showConfirmationModal(
							'Library Missing',
							`The Library Plugin needed for ${config.info.name} is missing. Please click "Download Now" to install it.`,
							{
								confirmText: 'Download Now',
								cancelText: 'Cancel',
								onCancel: () => {
									delete window.BDFDB_Global.downloadModal;
								},
								onConfirm: () => {
									delete window.BDFDB_Global.downloadModal;
									this.downloadLibrary();
								}
							}
						);
					}
					if (
						!window.BDFDB_Global.pluginQueue.includes(
							config.info.name
						)
					)
						window.BDFDB_Global.pluginQueue.push(config.info.name);
				}
				start() {
					this.load();
				}

				stop() {}

				getSettingsPanel() {
					const settingsTemplate = document.createElement('template');
					settingsTemplate.innerHTML = `<div style="color: var(--header-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The Library Plugin needed for ${config.info.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
					settingsTemplate.content.firstElementChild
						.querySelector('a')
						.addEventListener('click', this.downloadLibrary);
					return settingsTemplate.content.firstElementChild;
				}
		  }
		: (([Plugin, BDFDB]) => {
				const TextInput = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byDisplayName('TextInput')
				);
				const LegacyText = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byDisplayName('LegacyText')
				);
				const ConfirmationModal = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byDisplayName('ConfirmModal')
				);
				const Modal = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byProps('openModal', 'updateModal')
				);
				const Button = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byProps('ButtonColors')
				);
				const MessageSender = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byProps('sendMessage')
				);
				const CurrentChannel = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byProps(
						'getChannelId',
						'getCurrentlySelectedChannelId'
					)
				);
				const Message = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byProps('getMessage', 'getMessages')
				);
				const CurrentUser = BdApi.Webpack.getModule(
					BdApi.Webpack.Filters.byProps('getCurrentUser', 'getUser')
				);

				return class ReadIndicator extends Plugin {
					onLoad() {
						this.defaults = {
							general: {
								hostname: {
									type: 'TextInput',
									value: 'imgri.cf',
									description: 'Hostname'
								},
								automaticUpdates: {
									type: 'Switch',
									value: true,
									description:
										'Automatically check and install plugin updates'
								},
								blockUpdatersSentByOthers: {
									type: 'Switch',
									value: false,
									description:
										'Block updaters sent by others (same hostname)'
								}
							},
							personalization: {
								message: {
									type: 'TextInput',
									value: 'https://{{link_hostname}}/attachments/{{link_id}}.{{link_extension}}',
									description:
										'View Status Updater message content'
								},
								readStatusUpdaterLabel: {
									type: 'TextInput',
									value: 'Read',
									description: 'Read Status Updater label'
								},
								unreadStatusUpdaterLabel: {
									type: 'TextInput',
									value: 'Unread',
									description: 'Unread Status Updater label'
								},
								renderReadTicks: {
									type: 'Switch',
									value: true,
									description: 'Render read ticks'
								},
								readTickTooltip: {
									type: 'TextInput',
									value: '{{views}} Views',
									description: 'Read tick tooltip'
								},
								readTickColor: {
									type: 'TextInput',
									value: '#5865F2',
									description: 'Read tick color'
								},
								readTickSVG: {
									type: 'TextInput',
									value: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17',
									description: 'Read tick SVG Data'
								},
								renderUnreadTicks: {
									type: 'Switch',
									value: true,
									description: 'Render unread ticks'
								},
								unreadTickTooltip: {
									type: 'TextInput',
									value: 'Unread',
									description: 'Unread tick tooltip'
								},
								unreadTickColor: {
									type: 'TextInput',
									value: 'currentColor',
									description: 'Unread tick color'
								},
								unreadTickSVG: {
									type: 'TextInput',
									value: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17',
									description: 'Unread tick SVG Data'
								}
							},
							notifications: {
								sendUpdater: {
									value: true,
									description:
										'Notification on send View Status Updater'
								}
							}
						};

						this.patchedModules = {
							before: {
								SimpleMessageAccessories: 'default'
							},
							after: {
								MessageContent: 'type',
								ChannelTextAreaButtons: 'type'
							}
						};

						this.patchPriority = 8;
					}

					setupSocket() {
						this.socket = new WebSocket(
							`wss://${this.settings.general.hostname}`
						);

						this.socket.onopen = () => {
							this.socket.send(
								JSON.stringify({
									userToken: BDFDB.DataUtils.load(
										config.info.name,
										`hosts.${this.settings.general.hostname}.userToken`
									)
								})
							);

							console.log(
								`${config.info.name}: Connected to read indicator websocket.`
							);
						};

						this.socket.onmessage = (evt) => {
							const data = JSON.parse(evt.data);

							const dataIndex = this.updatersCache.findIndex(
								(upd) => upd.linkID === data.id
							);

							if (dataIndex >= 0) {
								this.updatersCache[dataIndex] = Object.assign(
									this.updatersCache[dataIndex],
									{ views: data.views }
								);

								this.updateCurrentUserChannelMessages();
							}
						};

						this.socket.onclose = (evt) => {
							if (evt.wasClean) {
								console.log(
									`${config.info.name}: Disconnected from read indicator websocket. (Clean)`
								);
							} else if (evt.reason === 'DESTROY') {
								console.log(
									`${config.info.name}: Websocket connection destroyed.`
								);
							} else {
								console.warn(
									`${config.info.name}: Websocket connection closed. Retrying in 5 seconds...`,
									evt
								);

								this.reconnectTimeout = setTimeout(
									() => this.setupSocket(),
									5000
								);
							}
						};
					}

					cleanSocket() {
						clearTimeout(this.reconnectTimeout);

						if (this.socket) {
							this.socket.close(1000, 'DESTROY');

							clearTimeout(this.reconnectTimeout);

							delete this.socket;
						}
					}

					async onStart() {
						this.forceUpdateAll();

						await this.checkForPluginUpdates();

						const savedUpdaters = BDFDB.DataUtils.load(
							config.info.name,
							`hosts.${this.settings.general.hostname}.updaters`
						);

						this.updatersCache = Array.isArray(savedUpdaters)
							? savedUpdaters
							: [];

						this.mainUpdater = setInterval(async () => {
							BDFDB.DataUtils.save(
								this.updatersCache,
								config.info.name,
								`hosts.${this.settings.general.hostname}.updaters`
							);
						}, 5000);

						if (await this.checkAPI()) {
							await this.registerAPI();
						}
					}

					async checkForPluginUpdates() {
						if (this.settings.general.automaticUpdates) {
							console.log(
								`${config.info.name}: Checking for plugin updates...`
							);

							require('request').get(
								config.info.updateUrl,
								(err, res, data) => {
									if (
										!err &&
										data &&
										res.statusCode === 200
									) {
										const currentVersion =
											config.info.version;

										const remoteVersion = grabVersion(data);

										if (currentVersion !== remoteVersion) {
											console.log(
												`${config.info.name}: Found update! ${currentVersion} -> ${remoteVersion}`
											);

											BdApi.Plugins.disable(
												config.info.name
											);
											writeFileSync(__filename, data);

											BdApi.Plugins.disable(
												config.info.name
											);

											BdApi.showToast(
												`Automatically updated ${config.info.name} v${currentVersion} to version ${remoteVersion}.`,
												{
													type: 'success',
													timeout: 20000
												}
											);
										} else {
											console.log(
												`${config.info.name}: No updates found`
											);
										}
									} else {
										BdApi.showToast(
											`Could not update ${config.info.name} v${currentVersion} to version ${remoteVersion}.`,
											{
												type: 'error',
												timeout: 20000
											}
										);
									}
								}
							);
						}
					}

					async sendLinkMessage() {
						const asset = this.asset;

						if (!asset)
							return BdApi.showToast(
								'Please provide a valid asset.',
								{
									type: 'error'
								}
							);

						const APIUpdater = await this.generateAPIUpdater(asset);

						if (!APIUpdater) return;

						if (APIUpdater.type === 'error')
							return BdApi.showToast(
								'Invalid asset provided. Please select a valid asset or a valid asset link (image/gif/video).',
								{
									type: 'error'
								}
							);

						await MessageSender.sendMessage(
							CurrentChannel.getChannelId(),
							{
								content: `${this.settings.personalization.message
									.replaceAll(
										'{{link_hostname}}',
										this.settings.general.hostname
									)
									.replaceAll(
										'{{link_id}}',
										APIUpdater.linkID
									)
									.replaceAll(
										'{{link_extension}}',
										asset.split('.').pop()
									)}`,
								tts: false,
								invalidEmojis: [],
								validNonShortcutEmojis: []
							}
						)
							.then((response) => {
								if (response.ok) {
									const newUpdater = {
										id: response.body.id,
										views: 0,
										channel: response.body.channel_id,
										linkID: APIUpdater.linkID,
										asset: asset
									};

									const cachedUpdaters =
										this.updatersCache ?? [];

									cachedUpdaters.push(newUpdater);

									this.updatersCache = cachedUpdaters;

									this.updateCurrentUserChannelMessages();

									if (this.settings.notifications.sendUpdater)
										BdApi.showToast(
											'Sent view status updater link to target.',
											{
												type: 'success'
											}
										);
								} else {
									BdApi.showToast(
										'An error ocurred while sending view status updater link to target.',
										{
											type: 'error'
										}
									);
								}
							})
							.catch(() => {
								BdApi.showToast(
									'An error ocurred while sending view status updater link to target.',
									{
										type: 'error'
									}
								);
							});
					}

					updateCurrentUserChannelMessages() {
						const currentChannelId = CurrentChannel.getChannelId();

						if (!currentChannelId) return;

						const messages =
							Message.getMessages(currentChannelId)?._array ?? [];

						const currentUserId = CurrentUser.getCurrentUser().id;

						if (!currentUserId) return;

						for (const message of messages) {
							if (message.author.id === currentUserId) {
								ZLibrary.DiscordModules.Dispatcher.dispatch({
									type: 'MESSAGE_UPDATE',
									message: message
								});
							}
						}
					}

					async checkAPI() {
						const apiWorking = await fetch(
							`https://${this.settings.general.hostname}/api/test`
						)
							.then((res) => res.json())
							.then(() => true)
							.catch(() => false);

						if (!apiWorking)
							this.showCriticalError(
								'Invalid hostname provided: API Returned error or is not responding. The plugin has been stopped.'
							);

						return apiWorking;
					}

					async getAPIAssets() {
						const assets = await fetch(
							`https://${this.settings.general.hostname}/api/assets`
						)
							.then((res) => res.json())
							.catch(() => null);

						if (!assets)
							this.showCriticalError(
								'Invalid hostname provided: API Returned error or is not responding. The plugin has been stopped.'
							);

						return assets;
					}

					async registerAPI() {
						const allSubscriptions = BDFDB.DataUtils.load(
							config.info.name,
							`hosts.${this.settings.general.hostname}.updaters`
						);

						const allSubscriptionsIDs = Object.values(
							allSubscriptions
						)
							.flat()
							.map((data) => data.linkID);

						const result = await fetch(
							`https://${this.settings.general.hostname}/api/register`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									subscriptions: allSubscriptionsIDs,
									userToken: BDFDB.DataUtils.load(
										config.info.name,
										`hosts.${this.settings.general.hostname}.userToken`
									)
								})
							}
						)
							.then((res) => res.json())
							.catch(() => false);

						if (!result)
							return this.showCriticalError(
								'Invalid hostname provided: API Returned error or is not responding. The plugin has been stopped.'
							);

						BDFDB.DataUtils.save(
							result.userToken,
							config.info.name,
							`hosts.${this.settings.general.hostname}.userToken`
						);

						const subscriptionsKeys = Object.keys(
							result.subscriptions
						);

						const subscriptionsEntries = Object.entries(
							result.subscriptions
						);

						this.updatersCache = this.updatersCache
							.filter((upd) =>
								subscriptionsKeys.includes(upd.linkID)
							)
							.map((upd) =>
								Object.assign(upd, {
									views: subscriptionsEntries.find(
										(sub) => sub[0] === upd.linkID
									)[1].views
								})
							);

						this.cleanSocket();

						this.setupSocket();

						this.updateCurrentUserChannelMessages();

						return true;
					}

					async generateAPIUpdater(asset) {
						const result = await fetch(
							`https://${this.settings.general.hostname}/api/generate`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									userToken: BDFDB.DataUtils.load(
										config.info.name,
										`hosts.${this.settings.general.hostname}.userToken`
									),
									asset: asset
								})
							}
						).catch(() => null);

						if (result.status === 401) {
							const registered = await this.registerAPI();

							if (!registered)
								return this.showCriticalError(
									'Invalid hostname provided: API Returned error or is not responding. The plugin has been stopped.'
								);

							return generateAPIUpdater(asset);
						}

						return result.json();
					}

					showCriticalError(error) {
						BdApi.showToast(`${config.info.name}: ${error}`, {
							type: 'error',
							timeout: 15000
						});

						this.stop();
					}

					processMessageContent(e) {
						if (e.instance.props.message) {
							if (e.returnvalue) {
								const message =
									new BDFDB.DiscordObjects.Message(
										e.instance.props.message
									);

								if (
									message.author.id ===
									CurrentUser.getCurrentUser().id
								) {
									const cachedUpdaters =
										this.updatersCache?.filter(
											(upd) =>
												upd.channel ===
												message.channel_id
										);

									if (cachedUpdaters?.length) {
										const updater = cachedUpdaters
											.filter(
												(upd) => upd.id >= message.id
											)
											.sort(
												(upd) => upd.id - message.id
											)[0];

										if (updater)
											e.returnvalue.props.children.push(
												this.createStamp(
													updater.views > 0
														? this.settings.personalization.readTickTooltip.replaceAll(
																'{{views}}',
																`${updater.views}`
														  )
														: this.settings.personalization.unreadTickTooltip.replaceAll(
																'{{views}}',
																`${updater.views}`
														  ),
													updater.views > 0,
													cachedUpdaters.find(
														(upd) =>
															upd.id ===
															message.id
													)
												)
											);
									}
								}
							}
						}
					}

					createStamp(tooltipText, view, isUpdater) {
						return BDFDB.ReactUtils.createElement(
							BDFDB.LibraryComponents.TooltipContainer,
							{
								text: tooltipText,
								tooltipConfig: { style: 'max-width: 400px' },
								children: isUpdater
									? BDFDB.ReactUtils.createElement(
											BDFDB.LibraryComponents
												.TooltipContainer,
											{
												text: tooltipText,
												tooltipConfig: {
													style: 'max-width: 400px'
												},
												children:
													BDFDB.ReactUtils.createElement(
														'span',
														{
															className:
																BDFDB.DOMUtils.formatClassName(
																	BDFDB.disCN
																		.messagetimestamp,
																	BDFDB.disCN
																		.messagetimestampinline
																),
															children:
																BDFDB.ReactUtils.createElement(
																	'span',
																	{
																		className:
																			BDFDB
																				.disCN
																				.messageedited,
																		children:
																			view
																				? this
																						.settings
																						.personalization
																						.readStatusUpdaterLabel
																				: this
																						.settings
																						.personalization
																						.unreadStatusUpdaterLabel
																	}
																)
														}
													)
											}
									  )
									: view
									? this.settings.personalization
											.renderReadTicks &&
									  BDFDB.ReactUtils.createElement('span', {
											className:
												BDFDB.DOMUtils.formatClassName(
													BDFDB.disCN
														.messagetimestamp,
													BDFDB.disCN
														.messagetimestampinline
												),
											children:
												BDFDB.ReactUtils.createElement(
													'svg',
													{
														width: '13',
														height: '13',
														viewBox: '0 0 24 24',
														children:
															BDFDB.ReactUtils.createElement(
																'path',
																{
																	fill: this
																		.settings
																		.personalization
																		.readTickColor,
																	d: this
																		.settings
																		.personalization
																		.readTickSVG
																}
															)
													}
												)
									  })
									: this.settings.personalization
											.renderUnreadTicks &&
									  BDFDB.ReactUtils.createElement('span', {
											className:
												BDFDB.DOMUtils.formatClassName(
													BDFDB.disCN
														.messagetimestamp,
													BDFDB.disCN
														.messagetimestampinline
												),
											children:
												BDFDB.ReactUtils.createElement(
													'svg',
													{
														width: '10',
														height: '10',
														viewBox: '0 0 24 24',
														children:
															BDFDB.ReactUtils.createElement(
																'path',
																{
																	fill: this
																		.settings
																		.personalization
																		.unreadTickColor,
																	d: this
																		.settings
																		.personalization
																		.unreadTickSVG
																}
															)
													}
												)
									  })
							}
						);
					}

					processChannelTextAreaButtons(e) {
						if (
							(e.instance.props.type ==
								BDFDB.LibraryComponents.ChannelTextAreaTypes
									.NORMAL ||
								e.instance.props.type ==
									BDFDB.LibraryComponents.ChannelTextAreaTypes
										.NORMAL_WITH_ACTIVITY ||
								e.instance.props.type ==
									BDFDB.LibraryComponents.ChannelTextAreaTypes
										.SIDEBAR) &&
							!e.instance.props.disabled
						) {
							const thisClass = this;

							const sendViewUpdaterIcon = `<svg name="Send View Updater" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><extra/></svg>`;

							e.returnvalue.props.children.unshift(
								BDFDB.ReactUtils.createElement(
									class SendViewUpdaterButton extends BDFDB
										.ReactUtils.Component {
										render() {
											return BDFDB.ReactUtils.createElement(
												BDFDB.LibraryComponents
													.ChannelTextAreaButton,
												{
													className:
														BDFDB.DOMUtils.formatClassName(
															BDFDB.disCN
																.textareapickerbutton
														),
													iconSVG:
														sendViewUpdaterIcon,
													nativeClass: true,
													tooltip: {
														text: () =>
															'Send View Status Updater',
														tooltipConfig: {
															style: 'max-width: 400px'
														}
													},
													onClick: async () => {
														const assets =
															await thisClass.getAPIAssets();

														if (!assets)
															return BdApi.showToast(
																'An error ocurred while getting API Assets.',
																{
																	type: 'error'
																}
															);

														Modal.openModal(
															(props) => {
																if (
																	props.transitionState ===
																	3
																)
																	return null;

																return BDFDB.ReactUtils.createElement(
																	ConfirmationModal,
																	Object.assign(
																		props,
																		{
																			header: [
																				'Send View Status Updater',
																				BDFDB.ReactUtils.createElement(
																					'div',
																					{
																						className:
																							'divider-1wtgZ3'
																					}
																				),
																				BDFDB.ReactUtils.createElement(
																					LegacyText,
																					{
																						children:
																							'Asset image/gif/video URL (or select one frome the list above)'
																					}
																				),
																				BDFDB.ReactUtils.createElement(
																					BDFDB.ReactUtils.memo(
																						() => {
																							const [
																								value,
																								setValue
																							] =
																								BDFDB.ReactUtils.useState(
																									thisClass.asset ??
																										''
																								);

																							return BDFDB.ReactUtils.createElement(
																								TextInput,
																								{
																									value: value,
																									placeholder:
																										'https://asset.link/example.gif',
																									onInput:
																										({
																											target
																										}) => {
																											setValue(
																												target.value
																											);

																											thisClass.asset =
																												target.value;
																										}
																								}
																							);
																						}
																					)
																				),
																				BDFDB.ReactUtils.createElement(
																					'div',
																					{
																						className:
																							'divider-1wtgZ3'
																					}
																				),
																				BDFDB.ReactUtils.createElement(
																					LegacyText,
																					{
																						children:
																							'Warning: Viewing the chat in other clients without the plugin will count as read and sum a view.'
																					}
																				)
																			],
																			confirmButtonColor:
																				Button
																					.ButtonColors
																					.BRAND,
																			confirmText:
																				'Send',
																			cancelText:
																				'Nevermind',
																			onConfirm:
																				() =>
																					thisClass.sendLinkMessage(),
																			children:
																				[
																					BDFDB.ReactUtils.createElement(
																						class AssetsList extends BdApi
																							.React
																							.Component {
																							render() {
																								this.props.entries =
																									this.props.data.map(
																										(
																											entry
																										) =>
																											BDFDB.ReactUtils.createElement(
																												class AssetCard extends BdApi
																													.React
																													.Component {
																													render() {
																														return BDFDB.ReactUtils.createElement(
																															'div',
																															{
																																className:
																																	BDFDB
																																		.disCN
																																		.discoverycard,
																																children:
																																	[
																																		BDFDB.ReactUtils.createElement(
																																			'div',
																																			{
																																				className:
																																					BDFDB
																																						.disCN
																																						.discoverycardheader,
																																				children:
																																					[
																																						BDFDB.ReactUtils.createElement(
																																							'div',
																																							{
																																								children:
																																									[
																																										BDFDB.ReactUtils.createElement(
																																											'img',
																																											{
																																												className:
																																													BDFDB
																																														.disCN
																																														.discoverycardcover,
																																												src: `https://${thisClass.settings.general.hostname}/preview/${this.props.data}`,
																																												loading:
																																													'lazy',
																																												onClick:
																																													() => {
																																														Modal.closeAllModals();
																																														thisClass.asset =
																																															this.props.data;
																																														thisClass.sendLinkMessage();
																																													}
																																											}
																																										)
																																									]
																																							}
																																						)
																																					]
																																			}
																																		)
																																	]
																															}
																														);
																													}
																												},
																												{
																													data: entry
																												}
																											)
																									);

																								return BDFDB.ReactUtils.createElement(
																									'div',
																									{
																										className:
																											BDFDB
																												.disCN
																												.discoverycards,
																										children:
																											this
																												.props
																												.entries
																									}
																								);
																							}
																						},
																						{
																							data: assets
																						}
																					)
																				]
																		}
																	)
																);
															}
														);
													}
												}
											);
										}
									},
									{
										channelId: e.instance.props.channel.id
									}
								)
							);
						}
					}

					processSimpleMessageAccessories(e) {
						if (e.instance.props.message) {
							const message = new BDFDB.DiscordObjects.Message(
								e.instance.props.message
							);

							if (e.instance.props.message.content) {
								if (
									message.content.includes(
										`https://${this.settings.general.hostname}`
									) ||
									message.content.includes(
										`http://${this.settings.general.hostname}`
									)
								) {
									if (
										this.settings.personalization
											.blockUpdatersSentByOthers ||
										message.author.id ===
											CurrentUser.getCurrentUser().id
									) {
										message.embeds = [];
										message.files = [];

										BDFDB.ReactUtils.forceUpdate(
											e.instance
										);

										e.instance.props.message = message;
									}
								}
							}
						}
					}

					onStop() {
						clearInterval(this.mainUpdater);
						this.cleanSocket();
						this.forceUpdateAll();
					}

					getSettingsPanel(collapseStates = {}) {
						return BDFDB.PluginUtils.createSettingsPanel(this, {
							collapseStates: collapseStates,
							children: () => [
								BDFDB.ReactUtils.createElement(
									BDFDB.LibraryComponents.SettingsPanelList,
									{
										title: 'General',
										children: Object.entries(
											this.defaults.general
										).map(([key, value]) =>
											BDFDB.ReactUtils.createElement(
												BDFDB.LibraryComponents
													.SettingsSaveItem,
												{
													type: value.type,
													plugin: this,
													keys: ['general', key],
													label: this.defaults
														.general[key]
														.description,
													value: this.settings
														.general[key]
												}
											)
										)
									}
								),
								BDFDB.ReactUtils.createElement(
									BDFDB.LibraryComponents.SettingsPanelList,
									{
										title: 'Personalization',
										children: Object.entries(
											this.defaults.personalization
										).map(([key, value]) =>
											BDFDB.ReactUtils.createElement(
												BDFDB.LibraryComponents
													.SettingsSaveItem,
												{
													type: value.type,
													plugin: this,
													keys: [
														'personalization',
														key
													],
													label: this.defaults
														.personalization[key]
														.description,
													value: this.settings
														.personalization[key]
												}
											)
										)
									}
								),
								BDFDB.ReactUtils.createElement(
									BDFDB.LibraryComponents.SettingsPanelList,
									{
										title: 'Notifications',
										children: Object.keys(
											this.defaults.notifications
										).map((key) =>
											BDFDB.ReactUtils.createElement(
												BDFDB.LibraryComponents
													.SettingsSaveItem,
												{
													type: 'Switch',
													plugin: this,
													keys: [
														'notifications',
														key
													],
													label: this.defaults
														.notifications[key]
														.description,
													value: this.settings
														.notifications[key]
												}
											)
										)
									}
								)
							]
						});
					}

					onSettingsClosed() {
						if (this.SettingsUpdated) {
							delete this.SettingsUpdated;
							this.stop();
							this.start();
						}
					}

					forceUpdateAll() {
						BDFDB.PatchUtils.forceAllUpdates(this);
						BDFDB.MessageUtils.rerenderAll();
					}
				};
		  })(window.BDFDB_Global.PluginUtils.buildPlugin(config));
})();
