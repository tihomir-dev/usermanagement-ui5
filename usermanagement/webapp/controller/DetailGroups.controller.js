sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/util/formatter",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/BusyIndicator"
], (Controller, JSONModel, MessageToast, Formatter, MessageBox, Fragment, Filter, FilterOperator, BusyIndicator) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.DetailGroups", {
        formatter: Formatter,
        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oRouter = this.getOwnerComponent().getRouter();
            var groupsModel = new JSONModel({
                currentGroup: {},
                actionButtonsInfo: {
                    midColumn: {
                        fullScreen: true,
                        exitFullScreen: false,
                        closeColumn: true
                    }
                },
                isEditMode: false,
                groupsSelected: false,
                selectAllClicked: false
            });
            this.getView().setModel(groupsModel, "groupsModel");
            oRouter.getRoute("groupDetail").attachPatternMatched(this._onRouteMatched, this);
            sap.ui.getCore().getEventBus().subscribe("GroupChannel", "ReloadGroupDetail", function (channel, event, data) {
                var groupsModel = this.getView().getModel("groupsModel");
                var currentGroup = groupsModel.getProperty("/currentGroup");
                if (currentGroup && currentGroup.ID) {
                    this._loadGroupById(currentGroup.ID);
                    this._loadGroupMembers(currentGroup.ID);
                }
            }.bind(this));
        },
        _onRouteMatched: async function (oEvent) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                const layout = oEvent.getParameter("arguments").layout;
                const groupId = oEvent.getParameter("arguments").groupId;
                this._resetButtonStates();
                var layoutModel = this.getOwnerComponent().getModel("layout");
                if (layoutModel) {
                    layoutModel.setProperty("/layout", layout);
                }
                await this._loadGroupById(groupId);
                await this._loadGroupMembers(groupId);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingUserDetails"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        _loadGroupById: async function (groupdId) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var groupsModel = this.getView().getModel("groupsModel");
            sap.ui.core.BusyIndicator.show(0);
            try {
                var response = await fetch(`/api/groups/${groupdId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                var groupData = await response.json();
                groupsModel.setProperty("/currentGroup", groupData);
                groupsModel.setProperty("/editGroup", groupData);
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingUserDetailsRetry"), {
                    title: oResourceBundle.getText("errorTitle")
                });
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
            }
        },
        _loadGroupMembers: async function (groupdId) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var groupsModel = this.getView().getModel("groupsModel");
            sap.ui.core.BusyIndicator.show(0);
            try {
                var response = await fetch(`/api/groups/${groupdId}/members`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                var groupMembers = await response.json();
                groupsModel.setProperty("/currentGroup/members", groupMembers.members);
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);

            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingGroupsRetry"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            } finally {
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
            }
        },
        handleClose: function () {
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/isEditMode", false);
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "OneColumn");
                this._updateButtonStates(false, false, false);
            }
            this.getOwnerComponent().getRouter().navTo("groups");
        },
        _updateButtonStates: function (fullScreen, exitFullScreen, closeColumn) {
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", fullScreen);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", exitFullScreen);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", closeColumn);
        },
        handleFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "MidColumnFullScreen");
                this._updateButtonStates(false, true, true);
            }
        },
        handleExitFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "TwoColumnsBeginExpanded");
                this._updateButtonStates(true, false, true);
            }
        },
        _resetButtonStates: function () {
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", true);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", false);
            groupsModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", true);
        },
        handleEdit: function () {
            var oView = this.getView();
            var groupsModel = this.getView().getModel("groupsModel");
            var currentGroup = groupsModel.getProperty("/currentGroup");
            if (!this._oEditGroupDialog) {
                this._oEditGroupDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.EditGroupDialog",
                    this
                );
                oView.addDependent(this._oEditGroupDialog);
            }
            // Create a copy for editing
            var editGroup = JSON.parse(JSON.stringify(currentGroup));
            var editGroupModel = new sap.ui.model.json.JSONModel({
                name: editGroup.NAME,
                displayName: editGroup.DISPLAY_NAME,
                description: editGroup.DESCRIPTION,
                id: editGroup.ID
            });
            this.getView().setModel(editGroupModel, "editGroupModel");
            this._oEditGroupDialog.open();
        },
        onEditGroupSave: async function () {
            var editGroupModel = this.getView().getModel("editGroupModel");
            var editData = editGroupModel.getData();
            var groupsModel = this.getView().getModel("groupsModel");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (!editData.displayName) {
                sap.m.MessageToast.show(oResourceBundle.getText("requiredFieldsError"));
                return;
            }
            var updateData = {
                name: editData.name,
                displayName: editData.displayName,
                description: editData.description
            };
            try {
                var response = await fetch(`/api/groups/${editData.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(updateData)
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                var updatedData = await response.json();
                groupsModel.setProperty("/currentGroup", updatedData);
                await this._loadGroupMembers(editData.id);
                sap.m.MessageToast.show(oResourceBundle.getText("groupSavedSuccess"));
                this._oEditGroupDialog.close();
                this._reloadGroupsTable();
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("groupSaveError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        onEditGroupCancel: function () {
            this._oEditGroupDialog.close();
            this._oEditGroupDialog.destroy();
            this._oEditGroupDialog = null;
        },
        _reloadGroupsTable: function () {
            sap.ui.getCore().getEventBus().publish("GroupChannel", "ReloadGroups");
        },
        onAssignMembersSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource();
            var bSelected = oEvent.getParameter("selected");
            var bSelectAll = oEvent.getParameter("selectAll");
            var oItem = oEvent.getParameter("listItem");
            var oModel = this.getView().getModel("assignMembersModel");
            var assignedUserIds = oModel.getProperty("/assignedUserIds");
            // User clicked select-all checkbox
            if (bSelectAll === false) {
                Promise.resolve().then(() => {
                    oTable.getItems().forEach(function (item) {
                        var oCtx = item.getBindingContext("assignMembersModel");
                        if (!oCtx) return;
                        var userId = oCtx.getProperty("ID");
                        if (assignedUserIds.includes(userId)) {
                            oTable.setSelectedItem(item, true);
                        }
                    });
                });
                return;
            }
            //  User tries to deselect a single assigned row
            if (!bSelected && oItem) {
                var oCtx = oItem.getBindingContext("assignMembersModel");
                if (!oCtx) return;
                var userId = oCtx.getProperty("ID");
                if (assignedUserIds.includes(userId)) {
                    Promise.resolve().then(() => {
                        oTable.setSelectedItem(oItem, true);
                    });
                }
            }
        },
        onAssignMembers: function () {
            var oView = this.getView();
            var groupsModel = this.getView().getModel("groupsModel");
            var currentGroupId = groupsModel.getProperty("/currentGroup/ID");

            if (!this._oAssignMembersDialog) {
                this._oAssignMembersDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.AssignMembersDialog",
                    this
                );
                oView.addDependent(this._oAssignMembersDialog);
            }
            this._loadUsersForAssignment(currentGroupId);
        },
        onAssignMembersConfirm: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var assignMembersModel = this.getView().getModel("assignMembersModel");
            var assignMembersTable = this.getView().byId("assignMembersTable");
            var selectedItems = assignMembersTable.getSelectedItems();
            var groupId = assignMembersModel.getProperty("/groupId");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (selectedItems.length === 0) {
                MessageToast.show(oResourceBundle.getText("pleaseSelectMembersToAssign"));
                return;
            }
            var selectedUserIds = selectedItems.map(item =>
                item.getBindingContext("assignMembersModel").getProperty("ID")
            );
            try {
                var response = await fetch(`/api/groups/${groupId}/members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ userIds: selectedUserIds })
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                var result = await response.json();
                console.log("Members assigned:", result);
                MessageToast.show(oResourceBundle.getText("membersAssignedSuccess"));
                this._loadGroupMembers(groupId);
                this._oAssignMembersDialog.close();
            } catch (error) {
                console.error("Error assigning members:", error);
                MessageBox.error(oResourceBundle.getText("membersAssignError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        _loadUsersForAssignment: async function (groupId) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                var allUsersResponse = await fetch('/api/users');
                if (!allUsersResponse.ok) {
                    throw new Error(`HTTP ${allUsersResponse.status}: ${allUsersResponse.statusText}`);
                }
                var allUsersData = await allUsersResponse.json();
                var allUsers = allUsersData.items || [];
                var groupMembersResponse = await fetch(`/api/groups/${groupId}/members`);
                if (!groupMembersResponse.ok) {
                    throw new Error(`HTTP ${groupMembersResponse.status}: ${groupMembersResponse.statusText}`);
                }
                var groupMembersData = await groupMembersResponse.json();
                var memberUserIds = (groupMembersData.members || []).map(m => m.ID);
                // Store assigned IDs in model for comparison
                var assignMembersModel = new sap.ui.model.json.JSONModel({
                    users: allUsers.map(function (user) {
                        user.assigned = memberUserIds.indexOf(user.ID) !== -1;
                        return user;
                    }),
                    groupId: groupId,
                    assignedUserIds: memberUserIds
                });
                this.getView().setModel(assignMembersModel, "assignMembersModel");
                this._oAssignMembersDialog.open();
            } catch (error) {
                console.error("Error loading users:", error);
                MessageBox.error(oResourceBundle.getText("errorLoadingUsers"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        onAssignMembersCancel: function () {
            this._oAssignMembersDialog.close();
            this._oAssignMembersDialog.destroy();
            this._oAssignMembersDialog = null;
        },
        onGroupsSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource();
            var aSelectedItems = oTable.getSelectedItems();
            var groupsModel = this.getView().getModel("groupsModel");
            groupsModel.setProperty("/groupsSelected", aSelectedItems.length > 0);
        },
        onUnAssignMembers: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oTable = this.getView().byId("groupMemebersTable");
            var selectedItems = oTable.getSelectedItems();
            var groupsModel = this.getView().getModel("groupsModel");
            var currentGroup = groupsModel.getProperty("/currentGroup");
            if (selectedItems.length === 0) {
                MessageToast.show(oResourceBundle.getText("pleaseSelectMembersToUnassign"));
                return;
            }
            var selectedUserIds = selectedItems.map(item =>
                item.getBindingContext("groupsModel").getProperty("ID")
            );
            try {
                var response = await fetch(`/api/groups/${currentGroup.ID}/members`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ userIds: selectedUserIds })
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                var result = await response.json();
                console.log("Members unassigned:", result);
                sap.m.MessageToast.show(oResourceBundle.getText("membersUnassignedSuccess"));
                this._loadGroupMembers(currentGroup.ID);
                oTable.clearSelection();
                groupsModel.setProperty("/groupsSelected", false);
            } catch (error) {
                console.error("Error unassigning members:", error);
                MessageBox.error(oResourceBundle.getText("membersUnassignError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        onDeleteGroup: function () {
            var groupsModel = this.getView().getModel("groupsModel");
            var currentGroup = groupsModel.getProperty("/currentGroup");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            sap.m.MessageBox.confirm(
                oResourceBundle.getText("deleteGroupConfirmMessage"),
                {
                    title: oResourceBundle.getText("deleteGroupConfirmTitle"),
                    onClose: (sAction) => {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this._deleteGroup(currentGroup.ID);
                        }
                    }
                }
            );
        },
        _deleteGroup: async function (groupId) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                var response = await fetch(`/api/groups/${groupId}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                sap.m.MessageToast.show(oResourceBundle.getText("groupDeletedSuccess"));
                // Reload groups table
                this._reloadGroupsTable();
                // Close detail page
                this.handleClose();
            } catch (error) {
                console.error("Error deleting group:", error);
                MessageBox.error(oResourceBundle.getText("groupDeleteError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        showBusyIndicator: function (iDuration, iDelay) {
            BusyIndicator.show(iDelay || 0);
            if (iDuration && iDuration > 0) {
                if (this._sBusyTimeoutId) {
                    clearTimeout(this._sBusyTimeoutId);
                    this._sBusyTimeoutId = null;
                }
                this._sBusyTimeoutId = setTimeout(function () {
                    this.hideBusyIndicator();
                }.bind(this), iDuration);
            }
        },
        hideBusyIndicator: function () {
            BusyIndicator.hide();
        },
    });
});