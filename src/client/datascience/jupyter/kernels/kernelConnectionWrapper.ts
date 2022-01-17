// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { Kernel } from '@jupyterlab/services';
import type {
    IInfoReply,
    ShellMessageType,
    IShellMessage,
    ControlMessageType,
    IControlMessage,
    IInfoReplyMsg,
    ICompleteReplyMsg,
    IInspectReplyMsg,
    IHistoryRequestRange,
    IHistoryRequestSearch,
    IHistoryRequestTail,
    IHistoryReplyMsg,
    IExecuteRequestMsg,
    IExecuteReplyMsg,
    IDebugRequestMsg,
    IDebugReplyMsg,
    IIsCompleteReplyMsg,
    ICommInfoReplyMsg,
    IReplyErrorContent,
    IReplyAbortContent,
    IInputReply,
    ICommOpenMsg,
    IIOPubMessage,
    IOPubMessageType,
    IMessage,
    MessageType
} from '@jupyterlab/services/lib/kernel/messages';
import { ISpecModel } from '@jupyterlab/services/lib/kernelspec/restapi';
import { JSONObject } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { Disposable } from 'vscode';
import { IDisposable } from '../../../common/types';
import { IKernel } from './types';

export class KernelConnectionWrapper implements Kernel.IKernelConnection {
    public readonly statusChanged = new Signal<this, Kernel.Status>(this);
    public readonly connectionStatusChanged = new Signal<this, Kernel.ConnectionStatus>(this);
    public readonly iopubMessage = new Signal<this, IIOPubMessage<IOPubMessageType>>(this);
    public readonly unhandledMessage = new Signal<this, IMessage<MessageType>>(this);
    public readonly anyMessage = new Signal<this, Kernel.IAnyMessageArgs>(this);
    public get serverSettings() {
        return this.kernelConnection.serverSettings;
    }
    public readonly disposed = new Signal<this, void>(this);

    constructor(
        readonly kernel: IKernel,
        private kernelConnection: Kernel.IKernelConnection,
        disposables: IDisposable[]
    ) {
        kernel.onDisposed(() => this.disposed.emit(), this, disposables);
        kernel.onStatusChanged(() => this.statusChanged.emit(kernel.status), this, disposables);
        this.startHandleKernelMessages(this.kernelConnection);
        disposables.push(new Disposable(() => this.stopHandlingKernelMessages(this.kernelConnection)));
    }
    public get id(): string {
        return this.kernelConnection.id;
    }
    public get name(): string {
        return this.kernelConnection.name;
    }
    public get isDisposed(): boolean {
        return this.kernel.disposed;
    }

    public get model(): Kernel.IModel {
        return this.kernelConnection.model;
    }
    public get username(): string {
        return this.kernelConnection.username;
    }
    public get clientId(): string {
        return this.kernelConnection.clientId;
    }
    public get status(): Kernel.Status {
        return this.kernelConnection.status;
    }
    public get connectionStatus(): Kernel.ConnectionStatus {
        return this.kernelConnection.connectionStatus;
    }
    public get info(): Promise<IInfoReply> {
        return this.kernelConnection.info;
    }
    public get spec(): Promise<ISpecModel | undefined> {
        return this.kernelConnection.spec;
    }
    public get handleComms(): boolean {
        return this.kernelConnection.handleComms;
    }
    sendShellMessage<T extends ShellMessageType>(
        msg: IShellMessage<T>,
        expectReply?: boolean,
        disposeOnDone?: boolean
    ): Kernel.IShellFuture<IShellMessage<T>, IShellMessage<ShellMessageType>> {
        return this.kernelConnection.sendShellMessage(msg, expectReply, disposeOnDone);
    }
    sendControlMessage<T extends ControlMessageType>(
        msg: IControlMessage<T>,
        expectReply?: boolean,
        disposeOnDone?: boolean
    ): Kernel.IControlFuture<IControlMessage<T>, IControlMessage<ControlMessageType>> {
        return this.kernelConnection.sendControlMessage(msg, expectReply, disposeOnDone);
    }
    reconnect(): Promise<void> {
        return this.kernelConnection.reconnect();
    }
    requestKernelInfo(): Promise<IInfoReplyMsg | undefined> {
        return this.kernelConnection.requestKernelInfo();
    }
    requestComplete(content: { code: string; cursor_pos: number }): Promise<ICompleteReplyMsg> {
        return this.kernelConnection.requestComplete(content);
    }
    requestInspect(content: { code: string; cursor_pos: number; detail_level: 0 | 1 }): Promise<IInspectReplyMsg> {
        return this.kernelConnection.requestInspect(content);
    }
    requestHistory(
        content: IHistoryRequestRange | IHistoryRequestSearch | IHistoryRequestTail
    ): Promise<IHistoryReplyMsg> {
        return this.kernelConnection.requestHistory(content);
    }
    requestExecute(
        content: {
            code: string;
            silent?: boolean | undefined;
            store_history?: boolean | undefined;
            user_expressions?: JSONObject | undefined;
            allow_stdin?: boolean | undefined;
            stop_on_error?: boolean | undefined;
        },
        disposeOnDone?: boolean,
        metadata?: JSONObject
    ): Kernel.IShellFuture<IExecuteRequestMsg, IExecuteReplyMsg> {
        return this.kernelConnection.requestExecute(content, disposeOnDone, metadata);
    }
    requestDebug(
        content: {
            seq: number;
            type: 'request';
            command: string; // Licensed under the MIT License.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            arguments?: any;
        },
        disposeOnDone?: boolean
    ): Kernel.IControlFuture<IDebugRequestMsg, IDebugReplyMsg> {
        return this.kernelConnection.requestDebug(content, disposeOnDone);
    }
    requestIsComplete(content: { code: string }): Promise<IIsCompleteReplyMsg> {
        return this.kernelConnection.requestIsComplete(content);
    }
    requestCommInfo(content: { target_name?: string | undefined }): Promise<ICommInfoReplyMsg> {
        return this.kernelConnection.requestCommInfo(content);
    }
    sendInputReply(content: IReplyErrorContent | IReplyAbortContent | IInputReply): void {
        return this.kernelConnection.sendInputReply(content);
    }
    createComm(targetName: string, commId?: string): Kernel.IComm {
        return this.kernelConnection.createComm(targetName, commId);
    }
    hasComm(commId: string): boolean {
        return this.kernelConnection.hasComm(commId);
    }
    registerCommTarget(
        targetName: string,
        callback: (comm: Kernel.IComm, msg: ICommOpenMsg<'iopub' | 'shell'>) => void | PromiseLike<void>
    ): void {
        return this.kernelConnection.registerCommTarget(targetName, callback);
    }
    removeCommTarget(
        targetName: string,
        callback: (comm: Kernel.IComm, msg: ICommOpenMsg<'iopub' | 'shell'>) => void | PromiseLike<void>
    ): void {
        return this.kernelConnection.removeCommTarget(targetName, callback);
    }
    registerMessageHook(
        msgId: string,
        hook: (msg: IIOPubMessage<IOPubMessageType>) => boolean | PromiseLike<boolean>
    ): void {
        return this.kernelConnection.registerMessageHook(msgId, hook);
    }
    removeMessageHook(
        msgId: string,
        hook: (msg: IIOPubMessage<IOPubMessageType>) => boolean | PromiseLike<boolean>
    ): void {
        return this.kernelConnection.removeMessageHook(msgId, hook);
    }
    shutdown(): Promise<void> {
        return this.kernel.dispose();
    }
    clone(
        _options?: Pick<Kernel.IKernelConnection.IOptions, 'clientId' | 'username' | 'handleComms'>
    ): Kernel.IKernelConnection {
        throw new Error('Method not implemented.');
    }
    dispose(): void {
        void this.kernel.dispose();
    }
    async interrupt(): Promise<void> {
        // Sometimes we end up starting a new session.
        // Hence assume a new session was created, meaning we need to bind to the kernel connection all over again.
        this.stopHandlingKernelMessages(this.kernelConnection);

        await this.kernel.interrupt();

        if (!this.kernel.session?.kernel) {
            throw new Error('Restart failed');
        }
        this.startHandleKernelMessages(this.kernel.session?.kernel);
    }
    async restart(): Promise<void> {
        this.stopHandlingKernelMessages(this.kernelConnection);

        // If this is a remote, then we do something special.
        await this.kernel.restart();

        if (!this.kernel.session?.kernel) {
            throw new Error('Restart failed');
        }
        this.startHandleKernelMessages(this.kernel.session?.kernel);
    }
    private startHandleKernelMessages(kernelConnection: Kernel.IKernelConnection) {
        this.kernelConnection = kernelConnection;
        kernelConnection.anyMessage.connect(this.onAnyMessage, this);
        kernelConnection.iopubMessage.connect(this.onIOPubMessage, this);
        kernelConnection.unhandledMessage.connect(this.onUnhandledMessage, this);
    }
    private stopHandlingKernelMessages(kernelConnection: Kernel.IKernelConnection) {
        kernelConnection.anyMessage.disconnect(this.onAnyMessage, this);
        kernelConnection.iopubMessage.disconnect(this.onIOPubMessage, this);
        kernelConnection.unhandledMessage.disconnect(this.onUnhandledMessage, this);
    }
    private onAnyMessage(connection: Kernel.IKernelConnection, msg: Kernel.IAnyMessageArgs) {
        if (connection === this.kernelConnection) {
            this.anyMessage.emit(msg);
        }
    }
    private onIOPubMessage(connection: Kernel.IKernelConnection, msg: IIOPubMessage) {
        if (connection === this.kernelConnection) {
            this.iopubMessage.emit(msg);
        }
    }
    private onUnhandledMessage(connection: Kernel.IKernelConnection, msg: IMessage<MessageType>) {
        if (connection === this.kernelConnection) {
            this.unhandledMessage.emit(msg);
        }
    }
}