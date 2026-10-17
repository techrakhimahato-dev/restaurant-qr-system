
export default function Page() {
  return (
    <main className="login-page">
      <h1>Admin Login</h1>
      <form className="login-form" action="/api/login" method="POST">
        <label htmlFor="username">Username</label>
        <input type="text" name="username" id="username" required />
        <label htmlFor="password">Password</label>
        <input type="password" name="password" id="password" required />
        <button type="submit">Login</button>
      </form>
    </main>
  );
}
