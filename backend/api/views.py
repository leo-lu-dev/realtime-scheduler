from django.shortcuts import render
from rest_framework import generics, viewsets
from .models import Note
from .serializers import NoteSerializer

class NoteListCreate(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer