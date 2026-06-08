# TODO

## Register + Payment Flow
- [x] Add backend auth status endpoint to return isPaid/paidAt
- [x] Update backend syncUser response to include isPaid/paidAt

- [ ] Create `src/pages/Register.jsx` (step 1 create account, step 2 enter mobile + pay)
- [ ] Add `/register` route in `src/App.jsx`
- [ ] Update `src/components/Header.jsx` navigation:
  - [ ] “Register” goes to `/register`
  - [ ] After login, show nav based on paid/unpaid state
- [ ] Simplify `src/pages/Login.jsx` to be login-only; sign up button navigates to `/register`
- [ ] Add frontend api helper for auth status (if needed)
- [ ] Manual testing: sign up → payment → dashboard; nav reflects paid state

