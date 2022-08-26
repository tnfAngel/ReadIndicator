/**
 * @name ReadIndicator
 * @author tnfAngel
 * @authorLink https://github.com/Thread-Development
 * @authorId 456361646273593345
 * @version 1.0.1
 * @description Shows a read tick when the destinatary read a message.
 */

module.exports = (() => {
	const config = {
		info: {
			name: 'ReadIndicator',
			author: 'tnfAngel',
			version: '1.0.1',
			description:
				'Adds a read badge when the destinatary read a message.'
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
							if (!e && b && r.statusCode == 200)
								require('fs').writeFile(
									require('path').join(
										BdApi.Plugins.folder,
										'0BDFDB.plugin.js'
									),
									b,
									(_) =>
										BdApi.showToast(
											'Finished downloading BDFDB Library',
											{ type: 'success' }
										)
								);
							else
								BdApi.alert(
									'Error',
									'Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library'
								);
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
				return class ReadIndicator extends Plugin {
					onLoad() {
						this.defaults = {
							host: {
								hostname: {
									value: 'imgri.cf',
									description: 'Hostname'
								}
							},
							personalization: {
								message: {
									type: 'TextInput',
									value: 'https://{{link_hostname}}/attachments/{{link_id}}.{{link_extension}}',
									description:
										'View Status Updater message content'
								},
								viewStatusUpdaterLabel: {
									type: 'TextInput',
									value: '(view updater)',
									description: 'View Status Updater label'
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
									value: 'Unreaded',
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
								Message: 'default',
								MessageContent: 'type',
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
							`wss://${this.settings.host.hostname}`
						);

						this.socket.onopen = (evt) => {
							this.socket.send(
								JSON.stringify({
									userToken: BDFDB.DataUtils.load(
										config.info.name,
										`hosts.${this.settings.host.hostname}.userToken`
									)
								})
							);

							console.log(
								'Connected to read indicator websocket.'
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
									'Disconnected from read indicator websocket.'
								);
							} else if (evt.reason !== 'DESTROY') {
								console.warn('Disconnect', evt);

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

						const savedUpdaters = BDFDB.DataUtils.load(
							config.info.name,
							`hosts.${this.settings.host.hostname}.updaters`
						);

						this.updatersCache = Array.isArray(savedUpdaters)
							? savedUpdaters
							: [];

						this.mainUpdater = setInterval(async () => {
							BDFDB.DataUtils.save(
								this.updatersCache,
								config.info.name,
								`hosts.${this.settings.host.hostname}.updaters`
							);
						}, 5000);

						const thisClass = this;

						const AssetsListComponent = class AssetsList extends BdApi
							.React.Component {
							render() {
								this.props.entries = this.props.data.map(
									(entry) =>
										BDFDB.ReactUtils.createElement(
											AssetCardComponent,
											{
												data: entry
											}
										)
								);

								return BDFDB.ReactUtils.createElement('div', {
									className: BDFDB.disCN.discoverycards,
									children: this.props.entries
								});
							}
						};

						const AssetCardComponent = class AssetCard extends BdApi
							.React.Component {
							render() {
								return BDFDB.ReactUtils.createElement('div', {
									className: BDFDB.disCN.discoverycard,
									children: [
										BDFDB.ReactUtils.createElement('div', {
											className:
												BDFDB.disCN.discoverycardheader,
											width: 16,
											height: 16,
											children: [
												BDFDB.ReactUtils.createElement(
													'div',
													{
														children: [
															BDFDB.ReactUtils.createElement(
																'img',
																{
																	className:
																		BDFDB
																			.disCN
																			.discoverycardcover,
																	src: `https://${thisClass.settings.host.hostname}/assets/${this.props.data}`,
																	loading:
																		'lazy',
																	onClick:
																		() => {
																			thisClass.asset =
																				this.props.data;
																			BdApi.showToast(
																				`Set send asset to ${this.props.data}`,
																				{
																					type: 'info'
																				}
																			);
																		}
																}
															)
														]
													}
												)
											]
										})
									]
								});
							}
						};

						const sendViewUpdaterIcon = `<svg name="Send View Updater" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><extra/></svg>`;

						this.SendViewUpdaterButtonComponent = class SendViewUpdaterButton extends (
							BdApi.React.Component
						) {
							render() {
								return BDFDB.ReactUtils.createElement(
									BDFDB.LibraryComponents
										.ChannelTextAreaButton,
									{
										className:
											BDFDB.DOMUtils.formatClassName(
												BDFDB.disCN.textareapickerbutton
											),
										iconSVG: sendViewUpdaterIcon,
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

											BdApi.showConfirmationModal(
												'Send View Status Updater',
												[
													'Caution: If you see the message in other platform without the plugin, it will count as view.',
													BDFDB.ReactUtils.createElement(
														AssetsListComponent,
														{
															data: assets
														}
													)
												],
												{
													cancelText: 'Nevermind',
													confirmText: 'Send',
													onConfirm: () => {
														thisClass.sendLinkMessage();
													}
												}
											);
										}
									}
								);
							}
						};

						if (await this.checkAPI()) {
							this.asset = await this.getAPIAssets().then(
								(assets) => (assets ? assets[0] : '')
							);

							await this.registerAPI();
						}
					}

					async sendLinkMessage() {
						const asset = this.asset;

						const APIUpdater = await this.generateAPIUpdater(asset);

						if (!APIUpdater)
							return BdApi.showToast(
								'An error ocurred while generating view status updater link.',
								{
									type: 'error'
								}
							);

						await BdApi.findModuleByProps('sendMessage')
							.sendMessage(
								BdApi.findModuleByProps(
									'getChannelId',
									'getCurrentlySelectedChannelId'
								).getChannelId(),
								{
									content: `${this.settings.personalization.message
										.replaceAll(
											'{{link_hostname}}',
											this.settings.host.hostname
										)
										.replaceAll(
											'{{link_id}}',
											APIUpdater.linkID
										)
										.replaceAll(
											'{{link_extension}}',
											asset.split('.')[1]
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
						const currentChannelId = BdApi.findModuleByProps(
							'getChannelId',
							'getCurrentlySelectedChannelId'
						).getChannelId();

						if (!currentChannelId) return;

						const messages =
							BdApi.findModuleByProps(
								'getMessage',
								'getMessages'
							).getMessages(currentChannelId)?._array ?? [];

						const currentUserId = BdApi.findModuleByProps(
							'getCurrentUser',
							'getUser'
						).getCurrentUser().id;

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
							`https://${this.settings.host.hostname}/api/test`
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
							`https://${this.settings.host.hostname}/api/assets`
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
							`hosts.${this.settings.host.hostname}.updaters`
						);

						const allSubscriptionsIDs = Object.values(
							allSubscriptions
						)
							.flat()
							.map((data) => data.linkID);

						const result = await fetch(
							`https://${this.settings.host.hostname}/api/register`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									subscriptions: allSubscriptionsIDs,
									userToken: BDFDB.DataUtils.load(
										config.info.name,
										`hosts.${this.settings.host.hostname}.userToken`
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
							`hosts.${this.settings.host.hostname}.userToken`
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
							`https://${this.settings.host.hostname}/api/generate`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									userToken: BDFDB.DataUtils.load(
										config.info.name,
										`hosts.${this.settings.host.hostname}.userToken`
									),
									asset: asset
								})
							}
						)
							.then((res) => res.json())
							.catch(() => null);

						if (!result || result.type === 'error') {
							const registered = await this.registerAPI();

							if (!registered)
								return this.showCriticalError(
									'Invalid hostname provided: API Returned error or is not responding. The plugin has been stopped.'
								);

							return false;
						}

						return result;
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
									BdApi.findModuleByProps(
										'getCurrentUser',
										'getUser'
									).getCurrentUser().id
								) {
									const cachedUpdaters =
										this.updatersCache.filter(
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
																			this
																				.settings
																				.personalization
																				.viewStatusUpdaterLabel
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
							e.returnvalue.props.children.unshift(
								BDFDB.ReactUtils.createElement(
									this.SendViewUpdaterButtonComponent,
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

							if (e.instance.props.message.content)
								for (let link of e.instance.props.message.content.split(
									/\n|\s|\r|\t|\0/g
								)) {
									if (
										link.indexOf('https://') > -1 ||
										link.indexOf('http://') > -1
									) {
										link =
											link.indexOf('<') == 0 &&
											link.indexOf('>') == link.length - 1
												? link.slice(1, -1)
												: link;

										if (
											link.includes(
												this.settings.host.hostname
											)
										) {
											message.embeds = [];
											message.files = [];

											BDFDB.ReactUtils.forceUpdate(
												e.instance
											);
										}
									}
								}

							e.instance.props.message = message;
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
										title: 'Host',
										children: [
											BDFDB.ReactUtils.createElement(
												BDFDB.LibraryComponents
													.SettingsSaveItem,
												{
													type: 'TextInput',
													plugin: this,
													keys: ['host', 'hostname'],
													label: this.defaults.host
														.hostname.description,
													value: this.settings.host
														.hostname
												}
											)
										]
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
