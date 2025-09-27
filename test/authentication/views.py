from django.shortcuts import render,redirect
from .models import User
from django.contrib.auth import authenticate , login , logout

def SignUpPage(request):

    context={
        'error' : ''
    }

    if request.method == "POST":

        fusers = User.objects.filter(username=request.POST['username'])
        if len(fusers)>0:
            context={
                'error': '*Username already exists!'
            }
            return render(request,'signup.html',context)
        else:
            if(request.POST['password']==request.POST['cpassword']):
                userd=User(username="",first_name="",last_name="",email="")
                userd.set_password(request.POST['password'])
                userd.save()
            return redirect('/')
    return render(request,'signup.html',context)

def LoginPage(request):

    context={
        'error': ''
    }

    if request.method == "POST":
        auser=authenticate(username=request.POST['username'] , password= request.POST['password'])
        if auser is not None:
            login(request,auser)
            return redirect('/book/home/')
        else:
            context={
                'error': 'username or password is incorrect'
            }
            return render(request,'login.html',context)
    return render(request, 'login.html',context)

def LogoutPage(request):
    logout(request)
    return redirect('/')
    

