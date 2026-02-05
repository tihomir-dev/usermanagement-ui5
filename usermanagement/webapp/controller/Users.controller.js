sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService",
    "com/customer/usermanagement/usermanagement/util/Constants",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], (Controller, JSONModel, MessageToast, UserService, Constants, MessageBox, BusyIndicator) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Users", {

        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this.oRouter = this.getOwnerComponent().getRouter();

            var allUsersModel = new JSONModel({
                users: [],
                total: 0,
                count: 0
            });
            var oOptionsModel = new JSONModel({
                statuses: Constants.USER_STATUSES(oResourceBundle),
                userTypes: Constants.USER_TYPES(oResourceBundle),
                countries: Constants.COUNTRIES
            });
            this.getView().setModel(allUsersModel, "allUsersModel");
            this.getView().setModel(oOptionsModel, "options");
            this.loadAllUsers();
            sap.ui.getCore().getEventBus().subscribe("UserChannel", "ReloadUsers", function () {
                this.loadAllUsers("");
            }.bind(this));
            sap.ui.getCore().getEventBus().subscribe("FiltersChannel", "ResetFilters", this.onResetFilters, this);
            this.fragments = {};
        },
        loadAllUsers: async function (queryString) {
            var oComponent = this.getOwnerComponent();
            var oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
            queryString = queryString || "";  // Default to empty string if not provided
            try {
                var allUsersModel = this.getView().getModel("allUsersModel");
                sap.ui.core.BusyIndicator.show(0);


                var response = await fetch(`/api/users${queryString}`);

                if (!response.ok) {
                    var sErrorMessage = oResourceBundle.getText("httpErrorMessage", [response.status]);
                    throw new Error(sErrorMessage);
                }
                const dbResponse = await response.json();
                allUsersModel.setProperty("/users", dbResponse.items);
                allUsersModel.setProperty("/total", dbResponse.total);
                allUsersModel.setProperty("/count", dbResponse.count);
                var oTable = this.getView().byId("usersTable");
                if (oTable) {
                    oTable.removeSelections(true);
                }
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingUsersMsg"), {
                    title: "Error",
                    onClose: function (sAction) {
                        setTimeout(() => {
                            sap.ui.core.BusyIndicator.hide();
                        }, 500);

                    }.bind(this)
                });
            }
        },
        onSearch: function (oEvent) {
            this.applyFilters();
        },
        onListItemPress: async function (oEvent) {
            try {
                const oSelectedItem = oEvent.getParameter("listItem");
                const oCtx = oSelectedItem.getBindingContext("allUsersModel");
                const userId = oCtx.getProperty("ID");
                this.oRouter.navTo("userDetail", {
                    userId: userId,
                    layout: "TwoColumnsBeginExpanded"
                });
            } catch (error) {
                var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageBox.error(
                    oResourceBundle.getText("errorOpeningUserDetails"),
                    {
                        title: oResourceBundle.getText("errorTitle"),
                        onClose: function (sAction) {
                        }.bind(this)
                    }
                );
            }
        },
        onCountryValueHelp: function (oEvent) {
            var oView = this.getView();
            var oInput = oEvent.getSource();
            if (!this.fragments.CountriesDialog) {
                this.fragments.CountriesDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.CountriesDialog",
                    this
                );
                oView.addDependent(this.fragments.CountriesDialog);
            }

            this._oCountryInput = oInput;
            this.fragments.CountriesDialog.open();
        },
        onCountryValueHelpClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");

            if (oSelectedItem) {
                var oCtx = oSelectedItem.getBindingContext("options");
                if (oCtx) {
                    var selectedCountry = oCtx.getObject();
                    this._oCountryInput.setValue(selectedCountry.code);
                    this.applyFilters();
                }
            }
            var sFragmentName = oEvent.getSource().data("name") || "CountriesDialog";
            var oFragment = this.fragments[sFragmentName];
            if (oFragment && typeof oFragment.close === "function") {
                oFragment.attachEventOnce("afterClose", function () {
                    oFragment.destroy();
                    delete this.fragments[sFragmentName];
                }.bind(this));

                oFragment.close();
            }
        },
        onCountrySearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        onStatusFilterChange: function (oEvent) {
            this.applyFilters();
        },
        onUserTypeFilterChange: function (oEvent) {
            this.applyFilters();
        },
        applyFilters: function () {
            var statusCombo = this.getView().byId("statusFilterCombo");
            var userTypeCombo = this.getView().byId("userTypeFilterCombo");
            var countryInput = this.getView().byId("countryFilterInput");
            var searchField = this.getView().byId("userSearchField");
            var search = searchField.getValue();
            var status = statusCombo.getSelectedKey();
            var userType = userTypeCombo.getSelectedKey();
            var country = countryInput.getValue();
            var queryParams = [];
            if (search) queryParams.push("search=" + encodeURIComponent(search));
            if (status) queryParams.push("status=" + encodeURIComponent(status));
            if (userType) queryParams.push("userType=" + encodeURIComponent(userType));
            if (country) queryParams.push("country=" + encodeURIComponent(country));
            var queryString = queryParams.length > 0 ? "?" + queryParams.join("&") : "";
            this.loadAllUsers(queryString);
        },
        onCountryInputChange: function (oEvent) {
            this.applyFilters();
        },
        onSearchLiveChange: function (oEvent) {
            if (this._searchTimeout) {
                clearTimeout(this._searchTimeout);
            }
            this._searchTimeout = setTimeout(() => {
                this.applyFilters();
            }, 300);
        },
        onResetFilters: function () {
            this.getView().byId("userSearchField").setValue("");
            this.getView().byId("statusFilterCombo").setSelectedKey("");
            this.getView().byId("userTypeFilterCombo").setSelectedKey("");
            this.getView().byId("countryFilterInput").setValue("");
            this.loadAllUsers("");
        },
        onCreate: function () {
            var oView = this.getView();
            if (!this._oCreateUserDialog) {
                this._oCreateUserDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.CreateUserDialog",
                    this
                );
                oView.addDependent(this._oCreateUserDialog);
            }
            // Initialize empty model for new user
            var createUserModel = new JSONModel({
                firstName: "",
                lastName: "",
                loginName: "",
                email: "",
                userType: "",
                status: "ACTIVE",
                company: "",
                country: "",
                city: "",
                validFrom: null,
                validTo: null
            });
            this.getView().setModel(createUserModel, "createUserModel");
            this._oCreateUserDialog.open();
        },
        onCreateUserSave: async function () {
            var createUserModel = this.getView().getModel("createUserModel");
            var userData = createUserModel.getData();
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            // Validate required fields
            var aInvalidFields = [];

            if (!userData.firstName) aInvalidFields.push("createFirstNameInput");
            if (!userData.lastName) aInvalidFields.push("createLastNameInput");
            if (!userData.loginName) aInvalidFields.push("createLoginNameInput");
            if (!userData.email) aInvalidFields.push("createEmailInput");
            if (!userData.userType) aInvalidFields.push("createUserTypeCombo");
            // If there are invalid fields, highlight them and return
            if (aInvalidFields.length > 0) {
                this._highlightInvalidFields(aInvalidFields);
                return;
            }
            // Clear any previous highlighting if validation passes
            this._clearFieldHighlighting();

            try {
                // Format dates for SCIM
                var validFromDate = userData.validFrom ? this._formatDateForSCIM(userData.validFrom) : null;
                var validToDate = userData.validTo ? this._formatDateForSCIM(userData.validTo) : null;
                var createData = {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    loginName: userData.loginName,
                    email: userData.email,
                    userType: userData.userType,
                    status: "ACTIVE",
                    company: userData.company,
                    country: userData.country,
                    city: userData.city,
                    validFrom: validFromDate,
                    validTo: validToDate
                };

                var response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(createData)
                });

                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                MessageToast.show(oResourceBundle.getText("userCreatedSuccess"));
                this._oCreateUserDialog.close();
                this._oCreateUserDialog.destroy();
                this._oCreateUserDialog = null;
                this.loadAllUsers("");
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("userCreateError"), {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                        this.getView().setBusy(false);
                    }.bind(this)
                });
            }
        },
        _highlightInvalidFields: function (aFieldIds) {
            var oView = this.getView();
            var aAllFieldIds = ["createFirstNameInput", "createLastNameInput", "createLoginNameInput", "createEmailInput", "createUserTypeCombo"];

            // First, clear highlighting from all fields
            aAllFieldIds.forEach(function (sFieldId) {
                var oControl = oView.byId(sFieldId);
                if (oControl) {
                    oControl.setValueState("None");
                    oControl.setValueStateText("");
                }
            });
            // Then highlight only the invalid fields
            aFieldIds.forEach(function (sFieldId) {
                var oControl = oView.byId(sFieldId);
                if (oControl) {
                    oControl.setValueState("Error");
                    oControl.setValueStateText("This field is required");
                }
            });
        },
        _clearFieldHighlighting: function () {
            var oView = this.getView();
            var aFieldIds = ["createFirstNameInput", "createLastNameInput", "createLoginNameInput", "createEmailInput", "createUserTypeCombo"];
            aFieldIds.forEach(function (sFieldId) {
                var oControl = oView.byId(sFieldId);
                if (oControl) {
                    oControl.setValueState("None");
                    oControl.setValueStateText("");
                }
            });
        },
        onCreateUserCancel: function () {
            this._oCreateUserDialog.close();
            this._oCreateUserDialog.destroy();
            this._oCreateUserDialog = null;
        },
        _formatDateForSCIM: function (dateValue) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (!dateValue) return null;
            try {
                var date;
                // Handle string date values
                if (typeof dateValue === 'string') {
                    date = new Date(dateValue);
                } else if (dateValue instanceof Date) {
                    date = dateValue;
                } else {
                    console.warn(oResourceBundle.getText("invalidDateType"), typeof dateValue);
                    return null;
                }
                // Validate the date
                if (isNaN(date.getTime())) {
                    console.warn(oResourceBundle.getText("invalidDateValue"), dateValue);
                    return null;
                }
                // Use UTC methods to ensure consistent timezone
                var year = date.getUTCFullYear();
                var month = String(date.getUTCMonth() + 1).padStart(2, '0');
                var day = String(date.getUTCDate()).padStart(2, '0');
                var hours = String(date.getUTCHours()).padStart(2, '0');
                var minutes = String(date.getUTCMinutes()).padStart(2, '0');
                var seconds = String(date.getUTCSeconds()).padStart(2, '0');

                // Format: YYYY-MM-DDTHH:mm:ssZ (matches IAS response format)
                var formattedDate = year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "Z";
                return formattedDate;
            } catch (error) {
                console.error(oResourceBundle.getText("errorFormattingDate"), error);
                return null;
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