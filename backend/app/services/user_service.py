from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from app.models.user import User
from app.core.security import create_access_token
from app.core.logger import logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """Service class for user-related operations"""
    
    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
        """Fetch a user by username"""
        try:
            result = await db.execute(select(User).filter(User.username == username))
            user = result.scalars().first()
            if user:
                logger.debug(f"User found: {username}")
            return user
        except Exception as e:
            logger.error(f"Error fetching user {username}: {e}", exc_info=True)
            return None
    
    @staticmethod
    async def create_user(db: AsyncSession, full_name: str, username: str, password: str) -> User:
        """Create a new user with hashed password"""
        try:
            hashed_password = pwd_context.hash(password)
            new_user = User(
                full_name=full_name,
                username=username,
                hashed_password=hashed_password
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            logger.info(f"User created successfully: {username}")
            return new_user
        except Exception as e:
            logger.error(f"Error creating user {username}: {e}", exc_info=True)
            await db.rollback()
            raise
    
    @staticmethod
    async def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
        """Authenticate user and return user object if valid"""
        try:
            user = await UserService.get_user_by_username(db, username)
            if not user:
                logger.warning(f"Authentication failed: User not found - {username}")
                return None
            if not await UserService.verify_password(password, user.hashed_password):
                logger.warning(f"Authentication failed: Invalid password - {username}")
                return None
            logger.info(f"User authenticated successfully: {username}")
            return user
        except Exception as e:
            logger.error(f"Error authenticating user {username}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def generate_token(username: str) -> str:
        """Generate JWT access token for user"""
        logger.debug(f"Generating token for user: {username}")
        return create_access_token(data={"sub": username})
