# School Management System with Salary Disbursement

A decentralized school management system built on Ethereum that manages staff registration, employment status, and salary disbursement using smart contracts.

## Features

### 🏫 Staff Management
- **Staff Registration**: Register teachers, mentors, admins, and security personnel
- **Role-based System**: Different roles with different salary structures
- **Employment Status Tracking**: Active, Inactive, Terminated, and Probation statuses
- **Mapping System**: Efficient mapping of staff addresses to their details

### 💰 Salary Management
- **Automated Salary Disbursement**: Pay salaries directly to staff wallets
- **Status-based Payment**: Only active staff can receive payments
- **Payment Tracking**: Track total amount paid to each staff member
- **Agreed Salary Amounts**: Fixed salary amounts agreed upon during registration

### 🔐 Security Features
- **Owner-only Operations**: Critical functions restricted to contract owner
- **Error Handling**: Comprehensive error handling with custom errors
- **Status Validation**: Payment only to active staff members
- **Fund Management**: Secure fund withdrawal capabilities

## Contract Architecture

### Interface (`ISalaryManagement.sol`)
Defines the contract interface with:
- **Enums**: Role (MENTOR, ADMIN, SECURITY, TEACHER) and Status (ACTIVE, INACTIVE, TERMINATED, PROBATION)
- **Struct**: Staff details including name, role, status, salary, and payment history
- **Events**: For tracking registration, payments, and status updates
- **Errors**: Custom error definitions for better error handling
- **Functions**: Interface declarations for all contract functions

### Main Contract (`SalaryManagement.sol`)
Implements the interface with:
- **Staff Registration**: Register new staff with agreed salary
- **Status Management**: Update employment status
- **Salary Payment**: Disburse salaries to active staff
- **Utility Functions**: Balance checking, staff listing, etc.

## Usage

### 1. Deploy the Contract
```bash
npx hardhat compile
npx hardhat deploy
```

### 2. Register Staff
```javascript
// Register a teacher with 2.5 ETH monthly salary
await salaryManagement.registerStaff(
  teacherAddress,
  "John Doe",
  3, // TEACHER role
  ethers.parseEther("2.5")
);
```

### 3. Update Staff Status
```javascript
// Set staff to active (required for salary payment)
await salaryManagement.updateStaffStatus(teacherAddress, 0); // ACTIVE

// Terminate staff
await salaryManagement.updateStaffStatus(teacherAddress, 2); // TERMINATED
```

### 4. Pay Salary
```javascript
// Pay salary to active staff
await salaryManagement.paySalary(teacherAddress, {
  value: ethers.parseEther("2.5")
});
```

### 5. Query Staff Information
```javascript
// Get staff details
const staffDetails = await salaryManagement.getStaffDetails(teacherAddress);

// Check if staff is active
const isActive = await salaryManagement.isStaffActive(teacherAddress);

// Get total paid amount
const totalPaid = await salaryManagement.getTotalPaid(teacherAddress);
```

## Staff Roles

| Role | Enum Value | Description |
|------|------------|-------------|
| MENTOR | 0 | Senior staff with mentoring responsibilities |
| ADMIN | 1 | Administrative staff |
| SECURITY | 2 | Security personnel |
| TEACHER | 3 | Teaching staff |

## Employment Status

| Status | Enum Value | Description |
|--------|------------|-------------|
| ACTIVE | 0 | Currently employed and eligible for salary |
| INACTIVE | 1 | Temporarily inactive |
| TERMINATED | 2 | Employment terminated |
| PROBATION | 3 | New staff on probation (default) |

## Key Functions

### Owner Functions
- `registerStaff()`: Register new staff members
- `paySalary()`: Pay salary to active staff
- `updateStaffStatus()`: Update employment status
- `withdrawFunds()`: Withdraw contract funds
- `transferOwnership()`: Transfer contract ownership

### View Functions
- `getStaffDetails()`: Get complete staff information
- `getAllRegisteredStaff()`: List all registered staff
- `getStaffCount()`: Get total number of staff
- `isStaffActive()`: Check if staff is active
- `getTotalPaid()`: Get total salary paid to staff
- `getContractBalance()`: Get contract's ETH balance

## Error Handling

The contract uses custom errors for better gas efficiency and clearer error messages:

- `StaffNotRegistered()`: Staff address not found
- `StaffNotActive()`: Staff is not in active status
- `InsufficientBalance()`: Contract has insufficient funds
- `InvalidAmount()`: Invalid salary amount provided
- `OnlyOwner()`: Function called by non-owner
- `StaffAlreadyRegistered()`: Staff already registered

## Events

- `StaffRegistered`: Emitted when new staff is registered
- `SalaryPaid`: Emitted when salary is paid
- `StatusUpdated`: Emitted when staff status is updated

## Testing

Run the comprehensive test suite:

```bash
npx hardhat test
```

The test suite covers:
- Contract deployment
- Staff registration
- Status management
- Salary payment
- Error handling
- Complete workflow scenarios

## Security Considerations

1. **Access Control**: Critical functions restricted to owner
2. **Status Validation**: Payments only to active staff
3. **Amount Validation**: Salary amounts must match agreed amounts
4. **Fund Security**: Owner can withdraw excess funds
5. **Error Handling**: Comprehensive error handling prevents unexpected behavior

## Gas Optimization

- Custom errors instead of require statements
- Efficient mapping for staff lookup
- Minimal storage operations
- Optimized function modifiers

## Deployment

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npx hardhat compile
```

3. Run tests:
```bash
npx hardhat test
```

4. Deploy to network:
```bash
npx hardhat run scripts/deploy.ts --network <network-name>
```

## License

This project is licensed under the UNLICENSED license.
