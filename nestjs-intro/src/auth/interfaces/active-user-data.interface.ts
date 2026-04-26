export interface ActiveUserData {
  /**
   * The ID of the user
   */
  sub: number;

  /**
   * User's email address
   */
  email: string;

  /**
   * True when the signed-in user is an administrator
   */
  isAdmin: boolean;
}
