1.⁠ ⁠Lottery Smart Contract
Design and implement a Lottery smart contract with the following requirements:
1.⁠ ⁠Entry Rule
•⁠  ⁠A user can join the lottery by paying exactly 0.01 ETH (or a set entry fee).
•⁠  ⁠Multiple players can join.
2.⁠ ⁠Player Tracking
•⁠  ⁠Store the list of participants' addresses.
3.⁠ ⁠Random Winner Selection
•⁠  ⁠Once 10 players have joined, the contract automatically picks a winner.
•⁠  ⁠The winner receives the entire prize pool.
4.⁠ ⁠Events
•⁠  ⁠Emit events when a player joins and when a winner is chosen.
5.⁠ ⁠Security Considerations
•⁠  ⁠Prevent anyone from calling the winner selection function except the contract itself when 10 players have joined.
•⁠  ⁠Ensure no one can enter twice in the same round.
•⁠  ⁠Reset the lottery after each round.
Part B: Testing
•⁠  ⁠Write unit tests (using Hardhat) that check:
1.⁠ ⁠Users can enter only with the exact fee.
2.⁠ ⁠The contract correctly tracks 10 players.
3.⁠ ⁠Only after 10 players, a winner is chosen.
4.⁠ ⁠The prize pool is transferred correctly to the winner.
5.⁠ ⁠The lottery resets for the next round.
Part C: Automated Script
•⁠  ⁠Write a deployment + interaction script with hardhat / foundry that:
1.⁠ ⁠Deploys the contract.
2.⁠ ⁠Adds 10 test accounts to join the lottery.
3.⁠ ⁠Displays the winner's address and updated balances.
4.⁠ ⁠Runs the lottery again to confirm it resets properly.
