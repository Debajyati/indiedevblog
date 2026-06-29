+++
date = '2026-01-14T21:46:55+05:30'
draft = false
title = 'Simple Contact Form Setup With Django Autosend'
+++

If you are a fellow web developer looking for a developer friendly SendGrid alternative, then you are at the right place.

In this article, we will go through how to set up a simple contact form with Django (our main fullstack framework), Celery (for asynchronous task scheduling), and the AutoSend email API (for sending emails).

|💡| This tutorial is written in the purpose of making you familiar with how to use autosend in your django application. That is why the contact form setup will be very simple and no complex email validation logic or complicated rate limiting functionality will be incorporated.|
|-----|------|

Prerequisites: You must be well familiar with Django and python. Existing knowledge of celery and redis will be helpful but not required.

SendGrid is one of the oldest email delivery platforms as I know (if I am not wrong), offering powerful transactional and marketing email services since 2009.

But the tool has not evolved much over the years to provide a better developer experience.

In today's world, many modern tooling exist that make managing emails easier, faster and much more scalable.

Such one fantastic email delivery tool is [AutoSend](https://autosend.com).

{{< linkcard "https://autosend.com" >}}

If you want to know more and understand why you would love to consider AutoSend over SendGrid, these are some articles worth reading -
1. [SendGrid Alternative: Why AutoSend Is the Best Modern Email Platform](https://autosend.com/blog/sendgrid-alternative)
2. [AutoSend vs. SendGrid: The Email Infrastructure Wake-Up Call](https://medium.com/@sethkeddy/autosend-vs-sendgrid-the-email-infrastructure-wake-up-call-68015445590a)

**Extra Bits: Why Choose Autosend over Resend**
Well now you might question, "Well I haven't heard about sendgrid but I am using resend from the very beginning, and I like it a lot. Why would use this shiny new autosend?"
The answer is simple, the pricing!
From all the developers I know who use resend, I took feedback from them and they all said they didn't find resend's pricing plan very appealing.

Yes,
Resend has separate pricing for transactional and marketing emails and that price is quite high.
Resend has a popular 5k contacts per month plan for marketing emails which costs - 40$/month

{{< figure src="https://dev-to-uploads.s3.amazonaws.com/uploads/articles/oe71hn7c28gsu4rq65li.png" title="Marketing Emails Pricing - Resend.com" >}}

For 5k (more than 3k) transactional emails per month, you need at least - 20$/month subscription plan.

{{< figure src="https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hl4j8kckt2fng8v2mxs6.png" title="Transactional Emails Pricing - Resend.com" >}}

And you saw the screenshots - all of these without dedicated IPs. For Dedicated IPs support, you need an addon in resend.

![Resend Deliverability Features per pricing](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/px28wgbydotqlbibpvwd.png)

![Dedicated IP Addon - Resend.com](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/elo4xna8dvbfbwlibzla.png)

Meanwhile on autosend, in just $12/month, you get both transactional and marketing emails for 10k emails/month **(with dedicated IPs)**.

![Autosend Pricing - 10k emails/month - Both Transactional & Marketing Emails](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/7kac5y7spipf4kpiupsk.png)

Don't get me wrong, Resend has a generous free tier and both Resend and AutoSend are great Email platforms. But things are quite different when your needs are beyond simple, hobby level usage.

If you prefer a starter plan that is significantly more budget friendly for your startup, AutoSend is clearly the winner here.

Well, enough talk about comparisons.
I hope you are getting excited, so without waiting more, let's get started!

<img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeW15b2kxZGk4ZDcxd2VieHNtcDB1NHA2Z2FvcDVlcDFveWw3ZjNjaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WAE2N3F1fnDI1UCvYG/giphy.gif" width="100%">

## Set Up Autosend Account
Long story short,- get a domain if you don't have already one.
Once you have a domain, create an autosend account and head over to settings. click on the tab `domains`.
![autosend settings page](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/gzphk1qh245sl4axrayg.png)
Click on the **+ add domain** button.

It is recommended to give a subdomain of your domain, that should not already exist. Like if you have a domain of `johndoe.com`, give a subdomain like `notify.johndoe.com` or `emails.johndoe.com` or maybe even `mail.johndoe.com`.

Rest of the work is easy, autosend will provide you 4 TXT records and 1 MX record to set in your DNS manager. I use cloudflare for the nameservers and full DNS setup so I added those records in my cloudflare domain dashboard -> DNS -> Records.

After 5–10 minutes, verify that your domain has been successfully confirmed. Once verified, you can start sending emails using your new email domain through the autosend API.

For full info and complete documentation refer to:- [Domain Configuration - Autosend Docs](https://docs.autosend.com/domain)

Now that you have your email subdomain configured, let's start building.

## Step By Step Code
Let's quickly create a virtual environment for our Django project.
I use `uv` for managing my python projects, in case you are not familiar with uv, I will show you pip commands too.

### Bootstrap A Django Project & Install Dependencies
```sh
uv init django-autosend
cd django-autosend
source .venv/bin/activate # activating virtual environment
# on windows command prompt the command would be .\.venv\Scripts\activate
# on windows powershell the command would be .\.venv\Scripts\activate.ps1
```
With pip, it would be like this -
```sh
mkdir django-autosend
cd django-autosend
python -m venv .venv
source .venv/bin/activate # activating virtual environment
# on windows command prompt the command would be .\.venv\Scripts\activate
# on windows powershell the command would be .\.venv\Scripts\activate.ps1
```

Let's install the required dependencies -
```sh
uv add django 'django-tailwind[cookiecutter,honcho,reload]'  'celery[redis]' requests python-decouple
```
With pip, it would be -
```sh
pip install django 'django-tailwind[cookiecutter,honcho,reload]' 'celery[redis]' requests python-decouple
```

Great, as now we have installed the necessary dependencies, let's jump to writing code.

run - `django-admin startproject django_autosend ./` to bootstrap a new django project in the same directory you're currently in (django-autosend directory).
again run `python manage.py startapp contact` to create the app for our contact form.

### Initial Configuration

First things first, we need to add some variables in our project settings, to fully set it up.

But before that, create a `.env` file in your project root:
and paste the following code in there -
```sh
# .env
SECRET_KEY='your django secret key'
DEBUG=True
# Autosend Configuration
AUTOSEND_API_KEY='your autosend api key'
# Contact Form Email Configuration
FROM_EMAIL=hello@mail.yourdomain.com
FROM_NAME='Website Contact Form'
CONTACT_RECIPIENT_EMAIL=youremail@whateverdomain.com
CONTACT_RECIPIENT_NAME='Site Admin'

# Celer Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

Copy your Django secret key from your project root's `settings.py` file.

And, put it in your `.env` file.

Generate your AutoSend API key if you have not already created one.
I hope you have already set up your domain with AutoSend for sending emails.

Put that email domain in place of `hello@mail.yourdomain.com` for `FROM_EMAIL`. And, put your API key in **`AUTOSEND_API_KEY`**.

The `CONTACT_RECIPIENT_EMAIL` and `CONTACT_RECIPIENT_NAME` fields should contain the email ID and name of the recipient where you want the contact messages to be sent.

now in your settings.py add these lines -
```python
from decouple import config
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config("DEBUG", default=True, cast=bool)

# CELERY SETTINGS
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# Autosend Configuration
AUTOSEND_API_KEY = config('AUTOSEND_API_KEY')
AUTOSEND_API_URL = 'https://api.autosend.com/v1/mails/send'
FROM_EMAIL = config('FROM_EMAIL')
FROM_NAME = config('FROM_NAME', default='Website Contact Form')
CONTACT_RECIPIENT_EMAIL = config('CONTACT_RECIPIENT_EMAIL')
CONTACT_RECIPIENT_NAME = config('CONTACT_RECIPIENT_NAME', default='Site Admin')
```

In this project, I am using `django-tailwind` for styling my templates. So, we need to create a tailwindcss compatible Django app in our project for the tailwindcss classes to work properly. Run -

`python manage.py tailwind init` and provide the name your app as "theme". Then you would need to choose the installation method: standalone binary or npm-based.

I would use the standalone binary to skip the extra nodejs configurations in my django settings, and also I don't plan to use more tailwind plugins so in my opinion, npm based installation won't be needed.

Next,

I would add these lines in my settings.py file -
```python
TAILWIND_APP_NAME = "theme" # Register the generated 'theme' app
if DEBUG:
    # Add django_browser_reload only in DEBUG mode
    INSTALLED_APPS += ["django_browser_reload"]
    # Add django_browser_reload middleware only in DEBUG mode
    MIDDLEWARE += [
        "django_browser_reload.middleware.BrowserReloadMiddleware",
    ]

```

And add these apps (contact, tailwind, theme) in the INSTALLED_APPS list. It would look like this -
```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "contact",
    # third party apps
    "tailwind",
    "theme",
]
```
make sure your templates DIRS is nicely configured. -
```python
        "DIRS": [ 'templates' ],
```

You've to run `python manage.py tailwind install` now to install Tailwind CSS dependencies.

add -

```python
if settings.DEBUG:
    # Include django_browser_reload URLs only in DEBUG mode
    urlpatterns += [
        path("__reload__/", include("django_browser_reload.urls")),
    ]
```
in the `urls.py` file in your `django-autosend` app folder.

If you run into unusual problems, refer to [django-tailwind docs](https://django-tailwind.readthedocs.io/en/latest/installation.html) for more intel on tailwind configuration within django, or ask me directly in the comment section if I can help.

Finally, you should be able to use tailwind CSS classes in your Django templates.

Start the development server with -

```sh
python manage.py tailwind dev
```

Great, the tedious part is over. So, time to write some real code.

### The templates
create a base layout to built upon in other templates -

```django
<!DOCTYPE html>
<html lang="en">
{% load static tailwind_tags %}

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {% tailwind_css %}
  <title>{% block title %} {% endblock title %}</title>
</head>

<body class="bg-black">
  {% block content %}
  {% endblock content %}

  {% block javascript %}
  {% endblock javascript %}
</body>

</html>
```
name it `layout.html`.

now time for our dummy landing page -
```django
{% extends "layout.html" %}

{% block title %}
homepage
{% endblock title %}

{% block content %}
<div class="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-lg mt-12">
  <h2 class="text-xl font-bold text-blue-600">Nothing Useful in This Page</h2>
  <p class="text-gray-700 mt-2">Click on this <a class="underline text-indigo-700" href="{% url "contact" %}">link</a>
    to get to the Contact Form</p>
</div>
{% endblock content %}
```
It would look like this -

![Dummy Landing Page - black background webpage with a rectangular small white card where is written - "nothing useful in this page. Click here to go to the contact page".](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/pu62ki97pfaummps0mvh.png)

Finally our contact page -
```django
{% extends "layout.html" %}

{% block title %}Contact Us{% endblock title %}

{% block content %}

<div class="w-full flex-1 px-4 mx-auto max-w-2xl py-8">
  <!-- Page Header -->
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold text-blue-600 mb-2">Contact Us</h1>
    <p class="text-gray-400">We'd love to hear from you. Send us a message!</p>
  </div>

  <!-- Messages/Alerts -->
  {% if messages %}
    <div class="mb-6 space-y-3">
      {% for message in messages %}
        <div class="p-4 rounded-lg text-sm {% if message.tags == 'success' %}bg-green-500/10 text-green-400 border border-green-500/20{% elif message.tags == 'error' %}bg-red-500/10 text-red-400 border border-red-500/20{% elif message.tags == 'warning' %}bg-yellow-500/10 text-yellow-400 border border-yellow-500/20{% else %}bg-blue-500/10 text-blue-400 border border-blue-500/20{% endif %}" role="alert">
          {{ message }}
        </div>
      {% endfor %}
    </div>
  {% endif %}

  <!-- Contact Form -->
  <form method="post" class="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl border border-gray-700" id="contact-form">
    {% csrf_token %}

    <!-- Name Field -->
    <div class="mb-6">
      <label for="{{ form.name.id_for_label }}" class="block text-sm font-semibold text-gray-200 mb-2">
        {{ form.name.label }}
      </label>
      <input
        type="text"
        name="{{ form.name.name }}"
        id="{{ form.name.id_for_label }}"
        class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        placeholder="Your full name"
        {% if form.name.value %}value="{{ form.name.value }}"{% endif %}
        required
      >
      {% if form.name.errors %}
        <div class="mt-2 text-sm text-red-400">
          {{ form.name.errors }}
        </div>
      {% endif %}
    </div>

    <!-- Email Field -->
    <div class="mb-6">
      <label for="{{ form.email.id_for_label }}" class="block text-sm font-semibold text-gray-200 mb-2">
        {{ form.email.label }}
      </label>
      <input
        type="email"
        name="{{ form.email.name }}"
        id="{{ form.email.id_for_label }}"
        class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        placeholder="your.email@example.com"
        {% if form.email.value %}value="{{ form.email.value }}"{% endif %}
        required
      >
      {% if form.email.errors %}
        <div class="mt-2 text-sm text-red-400">
          {{ form.email.errors }}
        </div>
      {% endif %}
    </div>

    <!-- Message Field -->
    <div class="mb-6">
      <label for="{{ form.message.id_for_label }}" class="block text-sm font-semibold text-gray-200 mb-2">
        {{ form.message.label }}
      </label>
      <textarea
        name="{{ form.message.name }}"
        id="{{ form.message.id_for_label }}"
        rows="6"
        class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
        placeholder="Tell us what's on your mind..."
        required
      >{% if form.message.value %}{{ form.message.value }}{% endif %}</textarea>
      {% if form.message.errors %}
        <div class="mt-2 text-sm text-red-400">
          {{ form.message.errors }}
        </div>
      {% endif %}
    </div>

    <!-- Submit Button -->
    <div class="flex justify-center">
      <button
        type="submit"
        class="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        Send Message
      </button>
    </div>
  </form>
</div>

{% endblock %}
```

The Contact page will look like this -

![Contact Us page](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/6ualr9ysd78e735k816a.png)

Now we need to create a view functon & form object for the contact form to make it render & work properly.

### Create A Form For The contact Page

```python
from django import forms

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, label='Your Name', widget=forms.TextInput(attrs={'class': 'form-control'}))
    email = forms.EmailField(label='Your Email', widget=forms.EmailInput(attrs={'class': 'form-control'}))
    message = forms.CharField(widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 5}), label='Message')
```

Our django form is ready. Now time to create our views.
### Create Views For The Site

necessary imports -
```python
import requests
from django.shortcuts import render, redirect
from django.contrib import messages
from django.conf import settings
from .forms import ContactForm
```

As you can already see from imports, you will use the python requests module to send authenticated http requests to the AutoSend Web API.
First we need the dummy landing page to be shown so that website visitor can navigate to the contact page.

```python
# that dummy homepage ;)
def home(request):
    return render(request, "index.html")
```
next view function is for the contact page -
```python
def contact_view(request):
    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            # Extract cleaned data
            name = form.cleaned_data["name"]
            email = form.cleaned_data["email"]
            message = form.cleaned_data["message"]

            # Prepare Autosend API payload
            payload = {
                "to": {
                    "email": settings.CONTACT_RECIPIENT_EMAIL,  # e.g., your personal email
                    "name": settings.CONTACT_RECIPIENT_NAME,
                },
                "from": {
                    "email": settings.FROM_EMAIL, # autosend registered email
                    "name": settings.FROM_NAME,
                },
                "subject": f"New Contact Form Submission from {name}",
                "html": f"""
                <h2>New Message from {name}</h2>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Message:</strong></p>
                <p>{message}</p>
                """,
                "text": f"New Message from {name}\n\nEmail: {email}\n\nMessage:\n{message}",
                "replyTo": {"email": email, "name": name},
            }

            # Send via Autosend API
            headers = {
                "Authorization": f"Bearer {settings.AUTOSEND_API_KEY}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                settings.AUTOSEND_API_URL, json=payload, headers=headers
            )

            if response.status_code == 200:  # Accepted for delivery
                messages.success(request, "Your message has been sent successfully!")

                form = ContactForm()  # Reset the form
                return redirect("contact")
            else:
                messages.error(
                    request,
                    "Sorry, there was an issue sending your message. Please try again.",
                )
                # console log error for debugging
                print(f"Error sending email: {response.status_code} - {response.text}")
                print("Autosend API Error:", response.json())
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = ContactForm()

    return render(request, "contactform.html", {"form": form})
```
Some crucial things to understand -
1. We are sending a **plain text version** of the email along with the html version to make sure the email does not look spammy.
2. We are not mixing promotional language with the content because it is an transactional email, so that the email does not confuse the spam filters. This is another vital step to ensure your email doesn't end up being in the spam folder of the reciever's email client.
3. Lastly, I have added a replyto header in the json payload. You may think, why? But this is really the critical part. It allows the admin to immediately reach out to the user by hitting "Reply" in gmail or outlook whatever and have the response go to the *user's* email, not the `FROM_EMAIL`.

| :bulb: | If you are facing problems like emails ending up in the spam folder of the user, check [this](https://autosend.com/blog/emails-going-to-spam-heres-how-to-fix-it) out for your remedy.|
|--------|----------------------------------------------------|

### Setting The URLs For The Views
import the `include` function from `django.urls`, `views` from `contact` module(app) and add the views in urlpatterns.
The updated urls.py file in the django-autosend app will look like this -
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from contact import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("contact/", include("contact.urls")),
    path("", views.home, name="homepage"),
]

if settings.DEBUG:
    # Include django_browser_reload URLs only in DEBUG mode
    urlpatterns += [
        path("__reload__/", include("django_browser_reload.urls")),
    ]
```

Next, create a urls.py file in your contact app.
And paste the following code in there -
```python
from django.urls import path
from . import views

urlpatterns = [
    path('', views.contact_view, name='contact'),
]
```

now if you try to send an email using the contact form, it must work  great with email being sent successfully.


![Email Received from Website Contact Form - Viewing in GMail](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/lm6y5s7wsis0c3ubtgca.jpg)

![Contact Us page](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ndljub2m5kwhpvqjkfrm.png)

Now if you try to reply on the email you just received, it will go in the inbox the email of the user he/she put in email input in the form. like this -


![Reply from website admin through gmail](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/wovko8usayr4rpllq5ec.jpg)

So, is that all?

No, absolutely not! Building the contact page is not done yet!
We should add the functionality of sending a confirmation email to the user once the admin receives the message from user.

| :warning: | But remember this part is optional, you are still good to go with it. But sending user a confirmation response via email is a good practice, because this way, if the user's requirement is urgent, he/she will be able to contact the admin via email by replying the message received.|
|------------------|-------------------|

So, here the site admin's email & name will be given in the replyto header.

### Confirmation Email Sending task With Celery and Redis
First set up celery by adding these lines in the django_autosend app by creating a new celery.py file.

```python
from __future__ import annotations
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_autosend.settings")

app = Celery("django_autosend")

# Use Django settings with "CELERY_" prefix or custom config below
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.py in installed apps
app.autodiscover_tasks()
```

celery is now configured to auto discover tasks defined in the tasks.py file of any django app within the project.

So what remains is creating a tasks.py file in the contact app, defining the task in there and, import and use it in the contact_view function.

necessary imports -
```python
from celery import shared_task
import logging
import requests
from typing import Dict, Optional, Tuple, TypedDict, Union
from django.conf import settings
logger = logging.getLogger(__name__)
```
helper functions for generating html and text versions of email -
```python
def _generate_confirmation_email_html(name: str, message: str) -> str:
    return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #a0a00a 50%, #0a0a0a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Message Received!</h1>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Hi <strong>{name}</strong>,
                </p>

                <p style="font-size: 16px; margin-bottom: 20px;">
                    Thank you for reaching out! We've received your message and will get back to you as soon as possible.
                </p>

                <div style="background: #a0a00add; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #ffffff;">
                        <b>✓ Your message has been successfully delivered to our site administrator.</b>
                    </p>
                </div>

                <h3 style="color: black; margin-top: 30px; margin-bottom: 15px;">Your Message:</h3>
                <div style="background: white; padding: 20px; border-left: 4px solid black; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; white-space: pre-wrap; word-wrap: break-word; color: #555;">{message}</p>
                </div>

                <p style="font-size: 14px; color: black; margin-top: 30px;">
                    We typically respond within 24-48 hours. In the meantime, feel free to explore our website for more information.
                    If you have any urgent inquiries, please don't hesitate to reach out again.
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                <p>Although this is a system generated email,</p>
                <p>If your inquiries are urgent, feel free to hit reply.</p>
                <p>Our admin will recieve your reply shortly, and get back to you soon.</p>
            </div>
        </body>
        </html>
        """


def _generate_confirmation_email_text(name: str, message: str) -> str:
    return f"""
    Hi {name},

    Thank you for reaching out! We've received your message and will get back to you as soon as possible.

    ✓ Your message has been successfully delivered to our site administrator.

    Your Message:
    --------------------
    {message}
    --------------------

    We typically respond within 24-48 hours. In the meantime, feel free to explore our website for more information.
    If you have any urgent inquiries, please don't hesitate to reach out again.

    Although this is a system generated email,
    If your inquiries are urgent, feel free to hit reply.
    Our admin will recieve your reply shortly, and get back to you soon.
    """
```

Based on the autosend API reference I defined the type definition for the autosend API response.

look below -
```python
class AutosendErrorResponseData(TypedDict):
    message: str
    code: str
    details: Optional[Dict[str, str]]
    retryAfter: Optional[int]


class AutosendResponseData(TypedDict):
    success: bool
    data: Optional[Dict]
    error: Optional[AutosendErrorResponseData]
```

another helper function with comprehensive error handling (for improving maintainability) -
```python
def send_email(payload: Dict) -> Tuple[bool, Union[AutosendResponseData, Dict]]:
    """
    Send email via Autosend API

    Returns:
        Tuple of (success: bool, response_data: AutosendResponseData or error dict)
    """
    api_url = settings.AUTOSEND_API_URL
    api_key = settings.AUTOSEND_API_KEY
    try:
        response = requests.post(
            url=api_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

        response_data: AutosendResponseData = response.json()

        if response.status_code == 200:
            logger.info(f"Email sent successfully. Message: {response_data}")
            return True, response_data
        else:
            error_msg = response_data.get("error")
            logger.error(f"Autosend API error: {error_msg}")
            return False, response_data

    except requests.exceptions.Timeout:
        logger.error("Autosend API request timed out")
        return False, {"error": "Request timeout"}
    except requests.exceptions.RequestException as e:
        logger.error(f"Autosend API request failed: {str(e)}")
        return False, {"error": str(e)}
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}")
        return False, {"error": str(e)}
```

now finally our actual confirmation email sending function which will be given to the shared_task decorator of Celery so that it can be sent to the asynchronous task queue.

```python
@shared_task
def send_confirmation_email(name, email, from_name, from_email, message) -> None:
    email_content = _generate_confirmation_email_html(name, message)
    email_text_content = _generate_confirmation_email_text(name, message)
    payload = {
        "to": {
            "email": email,
            "name": name,
        },
        "from": {
            "email": from_email,
            "name": from_name,
        },
        "replyTo": {
            "email": settings.CONTACT_RECIPIENT_EMAIL,
            "name": settings.CONTACT_RECIPIENT_NAME,
        },
        "subject": "Thank you for contacting us",
        "html": email_content,
        "text": email_text_content,
    }
    success, data = send_email(payload)
    if not success:
        logger.error(data["error"])
```
Now import the function from tasks file, in `views.py` like this -
```python
from .tasks import send_confirmation_email
```

and call the function, just above the line that resets the form -
```python
# everything same as before on above
            if response.status_code == 200:  # Accepted for delivery
                messages.success(request, "Your message has been sent successfully!")
                send_confirmation_email.delay(name,email,settings.FROM_NAME,settings.FROM_EMAIL,message)
                form = ContactForm()  # Reset the form
                return redirect("contact")
# below everything same as before
```

## Full & Final Test With Celery & Redis Running
Generally in a production environment you will use docker for managing containers to run redis and celery but for this tutorial purpose I am running them directly. You can do it with docker if you prefer, by running -
```sh
docker run -d -p 6379:6379 redis
```
Otherwise, make sure you have redis server installed, on Ubuntu/WSL you can install redis server with
```sh
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server.service
sudo systemctl start redis-server.service
```

run the redis server with default options -
```sh
redis-server
```

![redis server running](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/mfpxjk4u0b3ort9o0q44.png)
and run the celery worker instance in a seperate terminal where the python virtual environment is activated -
```sh
celery -A django_autosend worker -l INFO
```

![celery worker instance started](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/z2f6yy6llzdspum3jm9o.png)
Make sure your django development server is already running in a separate terminal. Let's send another email again with the contact form, to see if the user gets a confirmation or not after the contact message is sent to the site admin's mail successfully.

![Sending a new message via the contact form](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/qy8tyr5q5bb3c0t0ba7q.jpg)

and it works! see that!

![celery worker success log message printed in console](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/hxmt03nndcpxo3vnjont.png)

![confirmation email recieved by user](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/frkae1r0xhs8f8mfv9ua.png)

How cool is that! We have finally built our robust working contact form that sends actual emails through our simple contact form that doesn't end up in the spam folder. All thanks to AutoSend.

## What's Next
Now what you can do is adding rate limiting, name and email validation logic, to further strengthen your site from fake messages  and spam bots.

But that will be way beyond the scope of this article so I leave that to you.

Lastly, autosend is not just a puny email sending API. It has many more useful features like -
1. Sending bulk emails to multiple recipients in a single API request,
2. Create, Update, delete **contacts** with an email registered in your autosend account so that you can get a single contact with an ID, or maybe search contacts by emails, and so much more!

Head over to the [AutoSend API reference](https://docs.autosend.com/api-reference/contacts/) for a detailed overview on what cool and important things you can do with it.

If you ran into problems I am attaching the github link of the source code of django project I created for this tutorial.

{{< linkcard "https://github.com/Debajyati/django-autosend" >}}

## Conclusion
Now, if you found this article helpful, if this blog added some value to your time and energy, please show some love by giving the article some likes and share it with your dev friends.

Feel free to connect with me on my socials :)

|[![My GitHub](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0tu7kfqhw7z1yzmng4ah.png)](https://github.com/Debajyati) | [![My LinkedIn](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/emp5sh8d4fq0g89lqsia.png)](https://www.linkedin.com/in/debajyati-dey/) | [![My Daily.dev](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/20akag0pdeq95u76k9e8.png)](https://app.daily.dev/debajyatidey) | [![My Peerlist](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/lscfsnjdwyhm803f7mlv.png)](https://peerlist.io/debajyati) | [![My Twitter](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0265bz6hmdfybuw0a605.png)](https://x.com/ddebajyati) |
|-----|------|-----|-----|-----|


Happy coding 🧑🏽‍💻👩🏽‍💻! Have a nice day ahead! 🚀

![Thank You](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/gtkhet64k4e1myvibnz3.jpg)

{{< _subscription_form >}}

