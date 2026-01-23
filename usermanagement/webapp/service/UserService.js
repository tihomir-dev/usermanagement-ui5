sap.ui.define([], function () {
    "use strict";

    return {
        
        getCurrentUser: async function () {
            try {
                const response = await fetch('/user-api/currentUser');
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const userData = await response.json();
                
                console.log("Current user data:", userData);
                
                
                return {
                    name: userData.firstname 
                        ? `${userData.firstname} ${userData.lastname}`
                        : userData.displayName || userData.email || userData.name || "User",
                    email: userData.email || "",
                    firstName: userData.firstname || "",
                    lastName: userData.lastname || "",
                    displayName: userData.displayName || "",
                    initials: this._getInitials(userData.firstname, userData.lastname)
                };
                
            } catch (error) {
                console.error("Error fetching user info:", error);
                
                // Fallback for errors
                return {
                    name: "Guest User",
                    email: "",
                    userId: "",
                    firstName: "",
                    lastName: "",
                    displayName: "",
                    initials: "GU"
                };
            }
        },
        
        
        _getInitials: function (firstName, lastName) {
            var initials = "";
            
            if (firstName) {
                initials += firstName.charAt(0).toUpperCase();
            }
            
            if (lastName) {
                initials += lastName.charAt(0).toUpperCase();
            }
            
            return initials || "U";
        }
    };
});