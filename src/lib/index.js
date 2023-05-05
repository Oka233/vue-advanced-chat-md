import { defineCustomElement } from 'vue'
import ChatWindow from './ChatWindow'

export const VueAdvancedChat = defineCustomElement(ChatWindow)

const PACKAGE_NAME = 'vue-advanced-chat-md'

export function register() {
	if (!customElements.get(PACKAGE_NAME)) {
		customElements.define(PACKAGE_NAME, VueAdvancedChat)
	}
}
