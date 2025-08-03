from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        user = await self.get_user(token)
        scope["user"] = user or AnonymousUser()
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token):
        if not token:
            print("❌ No token found in query string.")
            return None
        try:
            validated = UntypedToken(token)
            user_id = validated.get("user_id")
            print(f"✅ Valid token for user_id: {user_id}")
            return User.objects.get(id=user_id)
        except (TokenError, InvalidToken) as e:
            print(f"❌ Invalid token: {e}")
        except User.DoesNotExist:
            print(f"❌ User does not exist for token.")
        return None